import { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL, clusterApiUrl, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import { supabase } from './supabase';
import bs58 from 'bs58';
import CryptoJS from 'crypto-js';
import { TOKEN_PROGRAM_ID, createBurnCheckedInstruction } from '@solana/spl-token';

// Use devnet for development
const devnetConnection = new Connection(clusterApiUrl('devnet'), 'confirmed');
// Use mainnet for real balances with Helius RPC
const mainnetConnection = new Connection('https://mainnet.helius-rpc.com/?api-key=23750c00-b047-4444-84ae-39dae001dccd', 'confirmed');

// SPL token mint address
export const SPL_TOKEN_MINT_ADDRESS = '5NFBXUt4RSCP7FRLV8xNkTA6rZzhAWSrUzzuHanfpump';

// Secret key for encryption/decryption - should be stored in environment variables
const ENCRYPTION_SECRET = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'default-secret-key-change-in-production';

/**
 * Encrypts the private key using AES encryption
 */
const encryptPrivateKey = (privateKey: string): string => {
  return CryptoJS.AES.encrypt(privateKey, ENCRYPTION_SECRET).toString();
};

/**
 * Decrypts the private key
 */
const decryptPrivateKey = (encryptedPrivateKey: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedPrivateKey, ENCRYPTION_SECRET);
  return bytes.toString(CryptoJS.enc.Utf8);
};

/**
 * Creates a new Solana wallet (keypair)
 * @returns The created keypair
 */
export const createWallet = (): Keypair => {
  return Keypair.generate();
};

/**
 * Check if we're running on client side
 */
const isClient = () => {
  return typeof window !== 'undefined';
};

/**
 * Saves the wallet to user's profile in the database
 */
export const saveWalletToProfile = async (userId: string, publicKey: string, privateKey: string): Promise<{error: Error | null}> => {
  try {
    // Encrypt the private key before storing
    const encryptedPrivateKey = encryptPrivateKey(privateKey);
    
    const { error } = await supabase
      .from('profiles')
      .update({
        wallet_public_key: publicKey,
        wallet_private_key: encryptedPrivateKey,
        has_wallet: true,
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    
    return { error: null };
  } catch (error: any) {
    console.error('Error saving wallet:', error);
    return { error: new Error(error?.message || 'Unknown error saving wallet') };
  }
};

/**
 * Gets a wallet for a user from database
 */
export const getWallet = async (userId: string): Promise<{
  publicKey: string | null;
  privateKey: string | null;
  hasWallet: boolean;
  error: Error | null;
}> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('wallet_public_key, wallet_private_key, has_wallet')
      .eq('id', userId)
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (data) {
      let decryptedPrivateKey = null;
      if (data.wallet_private_key) {
        try {
          decryptedPrivateKey = decryptPrivateKey(data.wallet_private_key);
        } catch (decryptError) {
          console.error('Error decrypting private key:', decryptError);
          throw new Error('Failed to decrypt wallet private key');
        }
      }
      
      return {
        publicKey: data.wallet_public_key || null,
        privateKey: decryptedPrivateKey,
        hasWallet: data.has_wallet || false,
        error: null
      };
    }
    
    // No wallet found in database
    return {
      publicKey: null,
      privateKey: null,
      hasWallet: false,
      error: null
    };
  } catch (error: any) {
    console.error('Error getting wallet:', error);
    return { 
      publicKey: null,
      privateKey: null,
      hasWallet: false,
      error: new Error(error?.message || 'Unknown error getting wallet')
    };
  }
};

/**
 * Gets the balance for a wallet from devnet
 */
export const getWalletBalance = async (publicKey: string): Promise<{
  balance: number;
  error: Error | null;
}> => {
  try {
    const pubKey = new PublicKey(publicKey);
    const lamports = await devnetConnection.getBalance(pubKey);
    const balance = lamports / LAMPORTS_PER_SOL;
    
    return { balance, error: null };
  } catch (error: any) {
    console.error('Error getting wallet balance:', error);
    return { balance: 0, error: new Error(error?.message || 'Unknown error getting wallet balance') };
  }
};

/**
 * Gets the balance for a wallet from mainnet
 */
export const getMainnetWalletBalance = async (publicKey: string): Promise<{
  balance: number;
  error: Error | null;
}> => {
  try {
    const pubKey = new PublicKey(publicKey);
    const lamports = await mainnetConnection.getBalance(pubKey);
    const balance = lamports / LAMPORTS_PER_SOL;
    
    return { balance, error: null };
  } catch (error: any) {
    console.error('Error getting mainnet wallet balance:', error);
    let errorMessage = 'Unknown error getting mainnet wallet balance';
    if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error);
    }
    
    return { balance: 0, error: new Error(errorMessage) };
  }
};

/**
 * Restore wallet from private key
 */
export const restoreWalletFromPrivateKey = (privateKeyString: string): Keypair => {
  const secretKey = bs58.decode(privateKeyString);
  return Keypair.fromSecretKey(secretKey);
};

/**
 * Request airdrop of SOL to the wallet (devnet only)
 */
export const requestAirdrop = async (publicKey: string): Promise<{
  success: boolean;
  error: Error | null;
}> => {
  try {
    const pubKey = new PublicKey(publicKey);
    const signature = await devnetConnection.requestAirdrop(pubKey, LAMPORTS_PER_SOL);
    await devnetConnection.confirmTransaction(signature);
    
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error requesting airdrop:', error);
    return { success: false, error: new Error(error?.message || 'Unknown error requesting airdrop') };
  }
};

/**
 * Transfer SOL from one wallet to another
 */
export const transferSol = async (
  fromPrivateKey: string, 
  toAddress: string, 
  amount: number
): Promise<{
  signature: string | null;
  error: Error | null;
}> => {
  try {
    // Amount should be in SOL, convert to lamports
    const lamports = amount * LAMPORTS_PER_SOL;
    
    // Create keypair from private key
    const fromKeypair = restoreWalletFromPrivateKey(fromPrivateKey);
    const toPublicKey = new PublicKey(toAddress);
    
    // Create a transfer instruction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: toPublicKey,
        lamports,
      })
    );
    
    // Send and confirm transaction
    const signature = await sendAndConfirmTransaction(
      mainnetConnection,
      transaction,
      [fromKeypair]
    );
    
    return { signature, error: null };
  } catch (error: any) {
    console.error('Error transferring SOL:', error);
    let errorMessage = 'Unknown error transferring SOL';
    if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error);
    }
    
    return { signature: null, error: new Error(errorMessage) };
  }
};

/**
 * Gets the SPL token balance for a specific mint
 * @param walletPublicKey The public key of the wallet
 * @param mintAddress The mint address of the token (defaults to SPL_TOKEN_MINT_ADDRESS)
 * @returns The token balance and any error
 */
export const getTokenBalance = async (
  walletPublicKey: string,
  mintAddress: string = SPL_TOKEN_MINT_ADDRESS
): Promise<{
  balance: number;
  error: Error | null;
}> => {
  try {
    // Create PublicKey objects
    const walletPubKey = new PublicKey(walletPublicKey);
    const mintPubKey = new PublicKey(mintAddress);

    // Find all token accounts for this wallet that contain the specified mint
    const tokenAccounts = await mainnetConnection.getParsedTokenAccountsByOwner(
      walletPubKey,
      { mint: mintPubKey }
    );

    // Default balance is 0
    let balance = 0;

    // If token accounts are found, sum the balances
    if (tokenAccounts.value.length > 0) {
      for (const account of tokenAccounts.value) {
        const parsedInfo = account.account.data.parsed.info;
        const tokenAmount = parsedInfo.tokenAmount;
        
        // Add to balance, considering decimals
        balance += Number(tokenAmount.amount) / Math.pow(10, tokenAmount.decimals);
      }
    }

    return { balance, error: null };
  } catch (error: any) {
    console.error('Error getting token balance:', error);
    let errorMessage = 'Unknown error getting token balance';
    if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error);
    }
    
    return { balance: 0, error: new Error(errorMessage) };
  }
};

// Get devnet token balance (for testing)
export const getDevnetTokenBalance = async (
  walletPublicKey: string,
  mintAddress: string = SPL_TOKEN_MINT_ADDRESS
): Promise<{
  balance: number;
  error: Error | null;
}> => {
  try {
    // Create PublicKey objects
    const walletPubKey = new PublicKey(walletPublicKey);
    const mintPubKey = new PublicKey(mintAddress);

    // Find all token accounts for this wallet that contain the specified mint
    const tokenAccounts = await devnetConnection.getParsedTokenAccountsByOwner(
      walletPubKey,
      { mint: mintPubKey }
    );

    // Default balance is 0
    let balance = 0;

    // If token accounts are found, sum the balances
    if (tokenAccounts.value.length > 0) {
      for (const account of tokenAccounts.value) {
        const parsedInfo = account.account.data.parsed.info;
        const tokenAmount = parsedInfo.tokenAmount;
        
        // Add to balance, considering decimals
        balance += Number(tokenAmount.amount) / Math.pow(10, tokenAmount.decimals);
      }
    }

    return { balance, error: null };
  } catch (error: any) {
    console.error('Error getting devnet token balance:', error);
    let errorMessage = 'Unknown error getting devnet token balance';
    if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error);
    }
    
    return { balance: 0, error: new Error(errorMessage) };
  }
};

/**
 * Burns a specified amount of NYSA tokens and converts them to credits
 * @param privateKey The private key of the wallet
 * @param tokenAmount The amount of tokens to burn
 * @returns Success status and any error
 */
export const burnTokens = async (
  privateKey: string,
  tokenAmount: number
): Promise<{
  signature: string | null;
  success: boolean;
  error: Error | null;
}> => {
  try {
    console.log(`Starting burn process for ${tokenAmount} tokens`);
    
    // Load the wallet from private key
    const keypair = restoreWalletFromPrivateKey(privateKey);
    console.log(`Wallet loaded: ${keypair.publicKey.toString()}`);
    
    // Find the token account for this wallet that contains NYSA tokens
    const tokenAccounts = await mainnetConnection.getParsedTokenAccountsByOwner(
      keypair.publicKey,
      { mint: new PublicKey(SPL_TOKEN_MINT_ADDRESS) }
    );
    
    console.log(`Found ${tokenAccounts.value.length} token accounts`);
    
    if (tokenAccounts.value.length === 0) {
      throw new Error('No token account found for this wallet');
    }
    
    // Get token account info to check balance
    const tokenAccount = tokenAccounts.value[0];
    const parsedInfo = tokenAccount.account.data.parsed.info;
    const decimals = parsedInfo.tokenAmount.decimals;
    const currentBalance = Number(parsedInfo.tokenAmount.amount) / Math.pow(10, decimals);
    
    console.log(`Current token balance: ${currentBalance}`);
    
    // Check if user has enough tokens
    if (currentBalance < tokenAmount) {
      throw new Error(`Insufficient balance. You have ${currentBalance} but attempted to burn ${tokenAmount}`);
    }
    
    // Create real burn transaction instead of simulation
    // Get token account address
    const tokenAccountAddress = new PublicKey(tokenAccount.pubkey);
    const mintPubkey = new PublicKey(SPL_TOKEN_MINT_ADDRESS);
    
    // Calculate token amount with decimals
    const amountToSend = Math.floor(tokenAmount * Math.pow(10, decimals));
    
    // Create a transaction
    const transaction = new Transaction();
    
    // Add burn instruction to the transaction using createBurnCheckedInstruction
    const burnInstruction = createBurnCheckedInstruction(
      tokenAccountAddress,  // account (source token account)
      mintPubkey,          // mint
      keypair.publicKey,   // owner
      BigInt(amountToSend), // amount
      decimals,            // decimals
      []                   // multiSigners (empty if owner is not a multisig)
    );
    
    transaction.add(burnInstruction);
    
    // Sign and send the transaction
    console.log('Sending burn transaction...');
    const signature = await sendAndConfirmTransaction(
      mainnetConnection,
      transaction,
      [keypair]
    );
    
    console.log(`Burn transaction successful with signature: ${signature}`);
    return { signature, success: true, error: null };
  } catch (error: any) {
    console.error('Error in burnTokens:', error);
    let errorMessage = 'Unknown error burning tokens';
    if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error);
    }
    
    return { signature: null, success: false, error: new Error(errorMessage) };
  }
}; 