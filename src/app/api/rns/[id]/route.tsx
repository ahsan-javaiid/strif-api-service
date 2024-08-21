import { NextResponse } from "next/server";
import { providers, constants, utils, Contract } from 'ethers';
import cors from '../../../lib/cors';

const ROOTSTOCK_RPC_NODE = "https://public-node.rsk.co";

// REF: https://developers.rsk.co/rif/rns/architecture/registry/
const RNS_REGISTRY_ADDRESS = "0xcb868aeabd31e2b66f74e9a55cf064abb31a4ad5";

const stripHexPrefix = (hex: string) => hex.slice(2);

const RNS_REGISTRY_ABI = [
  "function resolver(bytes32 node) public view returns (address)",
  "function ttl(bytes32 node) public view returns (uint64)",
];

const RNS_ADDR_RESOLVER_ABI = [
  "function addr(bytes32 node) public view returns (address)",
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


const lookupName = async (address: string) => {
  try {

    const reverseRecordHash = utils.namehash(`${stripHexPrefix(address)}.addr.reverse`);
    const resolverAddress = await rnsRegistryContract.resolver(reverseRecordHash);
  
    if (resolverAddress === constants.AddressZero) {
      return null;
    }
  
    const nameResolverContract = new Contract(
      resolverAddress,
      RNS_NAME_RESOLVER_ABI,
      RNSProvider,
    );
  
    const name = await nameResolverContract.name(reverseRecordHash);
  
    if (name === undefined) {
      return null;
    }
  
    return name;
  } catch(e) {
    console.log('error', e);
    return null;
  }
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const getCovalentPage = async (link: string): Promise<any> => {
  try {
    const response = await fetch(`${link}?key=${process.env.APIKEY}`);
    
    if (response.ok) {
      const transactions =  await response.json();
      const links = transactions.data.links;
      const tx = transactions.data.items.find((item: any) => item.successful && item.to_address && item.to_address.toLowerCase() === '0xD9C79ced86ecF49F5E4a973594634C83197c35ab'.toLowerCase());

      if (tx) {
        return Promise.resolve(true);
      } else if (links.prev) {
        // Recursively check all pages
        return await getCovalentPage(links.prev);
      } else {
        return Promise.resolve(false);
      }

    } else {
      const error = await response.json();
      console.log('error in fetching tx:', error);
      return Promise.resolve(false);
    }

  } catch (e) {
    console.log('error calling api: ', e);
    return Promise.resolve(false);
  }
}

const checkRNSTx = async (address: string) => {
  try {

    const link = `https://api.covalenthq.com/v1/rsk-mainnet/address/${address}/transactions_v3/`;
    
    return await getCovalentPage(link);
  } catch (e) {
    console.log('error calling api: ', e);
    return Promise.resolve(false);
  }
}

export const GET = async (req: any, context: any) => { 
  const { params } = context;

  const [resolvedName, foundRNSContractInteraction] = await Promise.all([
    lookupName(params.id),
    checkRNSTx(params.id)
  ]);

  return NextResponse.json({
    data: {
      rnsName: resolvedName ? resolvedName: foundRNSContractInteraction ? '*.rsk': null,
      registered: resolvedName || foundRNSContractInteraction ? true: false 
    }
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