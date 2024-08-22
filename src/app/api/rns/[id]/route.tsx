import { NextResponse } from "next/server";
import { providers, constants, utils, Contract } from 'ethers';
import cors from '../../../lib/cors';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const ROOTSTOCK_RPC_NODE = "https://public-node.rsk.co";

// REF: https://developers.rsk.co/rif/rns/architecture/registry/
const RNS_REGISTRY_ADDRESS = "0xcb868aeabd31e2b66f74e9a55cf064abb31a4ad5";

const stripHexPrefix = (hex: string) => hex.slice(2);

const RNS_REGISTRY_ABI = [
  "function resolver(bytes32 node) public view returns (address)",
  "function ttl(bytes32 node) public view returns (uint64)",
];

const RNS_NAME_RESOLVER_ABI = [
  "function name(bytes32 node) external view returns (string)",
];

const RNSProvider = new providers.JsonRpcProvider(ROOTSTOCK_RPC_NODE);
const rnsRegistryContract = new Contract(
  RNS_REGISTRY_ADDRESS,
  RNS_REGISTRY_ABI,
  RNSProvider,
);


const lookupNameRnsContract = async (address: string) => {
  try {
    const reverseRecordHash = utils.namehash(`${stripHexPrefix(address)}.addr.reverse`);
    const resolverAddress = await rnsRegistryContract.resolver(reverseRecordHash);
  
    if (resolverAddress === constants.AddressZero) {
      return { rnsName: null, registered: false };
    }
  
    const nameResolverContract = new Contract(
      resolverAddress,
      RNS_NAME_RESOLVER_ABI,
      RNSProvider,
    );
    const name = await nameResolverContract.name(reverseRecordHash);
  
    if (name === undefined) {
      return { rnsName: null, registered: false };
    }
  
    return { rnsName: name, registered: true };
  } catch(e) {
    return { rnsName: null, registered: false };
  }
};

const getCovalentPage = async (link: string): Promise<any> => {
  try {
    const response = await fetch(`${link}?key=${process.env.APIKEY}`);
    
    if (response.ok) {
      const transactions =  await response.json();
      const links = transactions.data.links;
      const tx = transactions.data.items.find((item: any) => item.successful && item.to_address && item.to_address.toLowerCase() === '0xD9C79ced86ecF49F5E4a973594634C83197c35ab'.toLowerCase());

      if (tx) {
        return Promise.resolve({ rnsName: '*.rsk', registered: true });
      } else if (links.prev) {
        // Recursively check all pages if not found in current page
        return await getCovalentPage(links.prev);
      } else {
        return Promise.resolve({ rnsName: null, registered: false });
      }

    } else {
      return Promise.resolve({ rnsName: null, registered: false });
    }

  } catch (e) {
    return Promise.resolve({ rnsName: null, registered: false });
  }
}

const lookupCovalentIndexer = async (address: string) => {
  try {
    const link = `https://api.covalenthq.com/v1/rsk-mainnet/address/${address}/transactions_v3/`;
    
    return await getCovalentPage(link);
  } catch (e) {
    return Promise.resolve({ rnsName: null, registered: false });
  }
}

const lookupBlockscoutIndexer = async (address: string) => {
  try {
    const link = `https://bens.services.blockscout.com/api/v1/30/addresses:lookup?address=${address}&resolved_to=true&owned_by=true&only_active=true&order=ASC`;
    const response = await fetch(link);
    
    if (response.ok && response.status === 200) {
      const data =  await response.json();

      if (data.items && data.items.length > 0) {
        const [item] = data.items;
        
        return Promise.resolve({ rnsName: item.name, registered: true });
      } else {
        return Promise.resolve({ rnsName: null, registered: false });
      }

    } else {
      return Promise.resolve({ rnsName: null, registered: false });
    }

  } catch (e) {
    return Promise.resolve({ rnsName: null, registered: false });
  }
}

export const GET = async (req: any, context: any) => { 
  const { params } = context;

  const resolved = await Promise.all([
    lookupNameRnsContract(params.id),
    lookupCovalentIndexer(params.id),
    lookupBlockscoutIndexer(params.id)
  ]);

  const resolvedProviders = resolved.filter((item) => item.registered);

  const data = resolvedProviders.find((item: any) => item.rnsName !== '*.rsk') ?? resolvedProviders.find(item => item.rnsName);

  return NextResponse.json({
    data
  }, { status: 200, headers: corsHeaders });
}

export async function OPTIONS(request: Request) {
  return cors(
    request,
    new Response(null, {
      status: 204,
    })
  );
}