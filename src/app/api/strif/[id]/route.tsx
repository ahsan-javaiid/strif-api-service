import { NextResponse } from "next/server";
import { providers, utils, Contract } from 'ethers';
import cors from '../../../lib/cors';
import { abi } from '../../../lib/abi';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const ROOTSTOCK_RPC_NODE = "https://public-node.testnet.rsk.co";

const rskProvider = new providers.JsonRpcProvider(ROOTSTOCK_RPC_NODE);


const stRif = '0xD6Eb12591559C42e28d672197265b331B1Ad867d'.toLowerCase();

const STRIFTokenContract = new Contract(stRif, abi, rskProvider);

const balaneOfStRif = async (address: string) => {
  const balance = await STRIFTokenContract.balanceOf(address.toLowerCase());
  const formattedBalance = utils.formatUnits(balance, 18);
  
  return formattedBalance;
}

const totalSupply = async () => {
  const balance = await STRIFTokenContract.totalSupply();
  const formattedBalance = utils.formatUnits(balance, 18);
  
  return formattedBalance;
}

const getVotes = async (address: string) => {
  const balance = await STRIFTokenContract.getVotes(address.toLowerCase());
  const formattedBalance = utils.formatUnits(balance, 18);
  
  return formattedBalance;
}

export const GET = async (req: any, context: any) => { 
  const { params } = context;

  const [balance, supply, votingPower] = await Promise.all([
    balaneOfStRif(params.id),
    totalSupply(),
    getVotes(params.id)
  ]);

  return NextResponse.json({
    data: {
      stackedBalance: parseFloat(balance),
      totalSupply: parseFloat(supply),
      votingPower: parseFloat(votingPower),
      network: 'testnet'
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