import { NextResponse } from "next/server";
import { providers, constants, utils, Contract } from 'ethers';

const ROOTSTOCK_RPC_NODE = "https://public-node.rsk.co";

// REF: https://developers.rsk.co/rif/rns/architecture/registry/
const RNS_REGISTRY_ADDRESS = "0xcb868aeabd31e2b66f74e9a55cf064abb31a4ad5";

const stripHexPrefix = (hex: string) => hex.slice(2);

const RNS_REGISTRY_ABI = [
  "function resolver(bytes32 node) public view returns (address)",
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


export const GET = async (req: any, context: any) => { 
  const { params } = context;
  const resolvedName = await lookupName(params.id);
  
  return NextResponse.json({
    data: {
      rnsName: resolvedName,
      registered: resolvedName ? true: false 
    }
  }, { status: 200});
}