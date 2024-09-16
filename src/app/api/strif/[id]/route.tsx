import { NextResponse } from "next/server";
import { providers, utils, Contract } from 'ethers';
import cors from '../../../lib/cors';
import { abi } from '../../../lib/abi';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const ROOTSTOCK_RPC_NODE = "https://public-node.rsk.co";

const rskProvider = new providers.JsonRpcProvider(ROOTSTOCK_RPC_NODE);


// const stRif = '0xD6Eb12591559C42e28d672197265b331B1Ad867d'.toLowerCase();
const stRif = '0x5db91e24bd32059584bbdb831a901f1199f3d459'.toLowerCase();

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

let RIF_VALUE = 0.078623;
let LAST_UPDATED: any = new Date();
let isFirstTime = true;

const rifToUSD = async () => {
  if (oneDayPast() || isFirstTime) {

    // fetch latest value
    try {
      const link = `https://api.coingecko.com/api/v3/simple/price?ids=rif-token&vs_currencies=usd`;
      const response = await fetch(link);
      
      if (response.ok && response.status === 200) {
        const data =  await response.json();
        const val = data["rif-token"];
        if (val && val.usd) {
          // update value
          RIF_VALUE = val.usd;
          LAST_UPDATED = new Date();
          isFirstTime = false;
          return Promise.resolve(RIF_VALUE);
        } else {
          return Promise.resolve(RIF_VALUE);
        }
      } else {
        return Promise.resolve(RIF_VALUE);
      }
    } catch (e) {
      return Promise.resolve(RIF_VALUE);
    }
  } else {
    // use old value
    return Promise.resolve(RIF_VALUE);
  }
}

const oneDayPast = () => {
  if (LAST_UPDATED) {
    const currentDate = new Date();
    const differenceInMilliseconds = currentDate.getTime() - LAST_UPDATED.getTime();
    // 1 * 24 * 60 * 60 * 1000 is one day
    const threeMonthsInMilliseconds = 1 * 24 * 60 * 60 * 1000;
    // Check if the difference is greater than 1 day 
    return differenceInMilliseconds > threeMonthsInMilliseconds;
  }
   
  return false;
}

function isValidAddress(address: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(address)
}

export const GET = async (req: any, context: any) => { 
  const { params } = context;

  if(!isValidAddress(params.id)) {
    return NextResponse.json({
      msg: 'Address is not valid!'
    }, { status: 200, headers: corsHeaders });
  }

  const [balance, supply, votingPower, rifValue] = await Promise.all([
    balaneOfStRif(params.id),
    totalSupply(),
    getVotes(params.id),
    rifToUSD()
  ]);

  return NextResponse.json({
    data: {
      stackedBalance: parseFloat(balance),
      stackedBalanceUSD: rifValue * parseFloat(balance),
      totalSupply: parseFloat(supply),
      votingPower: parseFloat(votingPower),
      network: 'mainnet'
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