import React, { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { 
  createWallet, 
  saveWalletToProfile, 
  getWallet, 
  getMainnetWalletBalance, 
  transferSol, 
  getTokenBalance,
  SPL_TOKEN_MINT_ADDRESS
} from '../../../lib/wallet';
import bs58 from 'bs58';
import { QRCodeSVG } from 'qrcode.react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { supabase } from '../../../lib/supabase';

interface WalletSectionProps {
  user: User | null;
}

export default function WalletSection({ user }: WalletSectionProps) {
  const [hasWallet, setHasWallet] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: string } | null>(null);
  const [mainnetBalance, setMainnetBalance] = useState<number>(0);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [credits, setCredits] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [loadingTokenBalance, setLoadingTokenBalance] = useState(false);
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [tokenBalanceError, setTokenBalanceError] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const qrPopoverRef = useRef<HTMLDivElement>(null);
  
  // Withdraw state
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawAddress, setWithdrawAddress] = useState<string>('');
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);
  
  // Convert state
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertAmount, setConvertAmount] = useState<string>('');
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [convertSuccess, setConvertSuccess] = useState<string | null>(null);

  // Ekleyin: Token adı sabit değişkeni
  const TOKEN_NAME = "NYSA";

  useEffect(() => {
    if (user) {
      fetchWallet();
      fetchCredits();
    }
  }, [user]);

  const fetchWallet = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const { publicKey, privateKey, hasWallet, error } = await getWallet(user.id);
      
      if (error) {
        console.error('Error fetching wallet:', error);
        setHasWallet(false);
        setPublicKey(null);
        setPrivateKey(null);
        setLoading(false);
        return;
      }
      
      setHasWallet(hasWallet);
      setPublicKey(publicKey);
      setPrivateKey(privateKey);
      
      if (publicKey) {
        fetchMainnetBalance(publicKey);
        fetchTokenBalance(publicKey);
      }
    } catch (error: any) {
      console.error('Error in fetchWallet:', error);
      setHasWallet(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchMainnetBalance = async (walletAddress: string) => {
    setLoadingBalance(true);
    setBalanceError(null);
    try {
      const { balance, error } = await getMainnetWalletBalance(walletAddress);
      if (error) {
        console.error('Error fetching mainnet balance:', error);
        setBalanceError('Bakiye yüklenemedi. Lütfen daha sonra tekrar deneyin.');
      } else {
        setMainnetBalance(balance);
        setBalanceError(null);
      }
    } catch (error) {
      console.error('Error in fetchMainnetBalance:', error);
      setBalanceError('Beklenmeyen bir hata oluştu.');
    } finally {
      setLoadingBalance(false);
    }
  };

  const fetchTokenBalance = async (walletAddress: string) => {
    setLoadingTokenBalance(true);
    setTokenBalanceError(null);
    try {
      const { balance, error } = await getTokenBalance(walletAddress);
      if (error) {
        console.error('Error fetching token balance:', error);
        setTokenBalanceError('Token bakiyesi yüklenemedi. Lütfen daha sonra tekrar deneyin.');
      } else {
        setTokenBalance(balance);
        setTokenBalanceError(null);
      }
    } catch (error) {
      console.error('Error in fetchTokenBalance:', error);
      setTokenBalanceError('Beklenmeyen bir hata oluştu.');
    } finally {
      setLoadingTokenBalance(false);
    }
  };

  const fetchCredits = async () => {
    if (!user) return;
    
    setLoadingCredits(true);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching credits:', error);
      } else if (data) {
        setCredits(parseFloat(data.credits) || 0);
      }
    } catch (error) {
      console.error('Error in fetchCredits:', error);
    } finally {
      setLoadingCredits(false);
    }
  };

  const handleCreateWallet = async () => {
    if (!user) {
      setMessage({ text: 'You must be logged in to create a wallet', type: 'error' });
      return;
    }
    
    setCreating(true);
    setMessage(null);
    
    try {
      // Generate new keypair
      const keypair = createWallet();
      const publicKey = keypair.publicKey.toString();
      const privateKey = bs58.encode(keypair.secretKey);
      
      // Save to database
      const { error } = await saveWalletToProfile(user.id, publicKey, privateKey);
      
      if (error) {
        throw error;
      }
      
      setPublicKey(publicKey);
      setPrivateKey(privateKey);
      setHasWallet(true);
      setMessage({ 
        text: 'Wallet created successfully!', 
        type: 'success' 
      });
      
      // Check mainnet balance
      fetchMainnetBalance(publicKey);
    } catch (error: any) {
      console.error('Error creating wallet:', error);
      setMessage({ 
        text: `Failed to create wallet: ${error.message || 'Unknown error'}`, 
        type: 'error' 
      });
      setHasWallet(false);
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle clicks outside the QR popover to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (qrPopoverRef.current && !qrPopoverRef.current.contains(event.target as Node)) {
        setShowQR(false);
      }
    }

    if (showQR) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showQR]);

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Input validation
    if (!withdrawAmount || isNaN(parseFloat(withdrawAmount)) || parseFloat(withdrawAmount) <= 0) {
      setWithdrawError('Please enter a valid amount');
      return;
    }
    
    const amount = parseFloat(withdrawAmount);
    if (amount > mainnetBalance) {
      setWithdrawError('Insufficient balance');
      return;
    }
    
    if (!withdrawAddress) {
      setWithdrawError('Please enter a valid address');
      return;
    }
    
    try {
      // Basic address validation
      if (withdrawAddress.length !== 44 && withdrawAddress.length !== 43) {
        setWithdrawError('Invalid Solana address');
        return;
      }
      
      // Clear errors and show confirmation
      setWithdrawError(null);
      setShowWithdrawConfirm(true);
    } catch (error) {
      setWithdrawError('Invalid address format');
    }
  };
  
  const executeWithdraw = async () => {
    if (!privateKey || !withdrawAddress || !withdrawAmount) {
      setWithdrawError('Missing information required for transaction');
      setShowWithdrawConfirm(false);
      return;
    }
    
    setWithdrawing(true);
    setWithdrawError(null);
    setWithdrawSuccess(null);
    
    try {
      const amount = parseFloat(withdrawAmount);
      const { signature, error } = await transferSol(privateKey, withdrawAddress, amount);
      
      if (error) {
        throw error;
      }
      
      if (signature) {
        setWithdrawSuccess(`Transaction successful! Transaction signature: ${signature.slice(0, 8)}...`);
        setWithdrawAmount('');
        setWithdrawAddress('');
        
        // Update balances after successful transaction
        if (publicKey) {
          fetchMainnetBalance(publicKey);
          fetchTokenBalance(publicKey); // Also refresh token balance
        }
      } else {
        throw new Error('Could not get transaction signature');
      }
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      setWithdrawError(error.message || 'An error occurred during the withdrawal process');
    } finally {
      setWithdrawing(false);
      setShowWithdrawConfirm(false);
    }
  };
  
  const cancelWithdraw = () => {
    setShowWithdrawConfirm(false);
    setWithdrawError(null);
  };

  // Calculate maximum withdrawal amount (leaving 0.001 SOL for fees)
  const getMaxWithdrawAmount = () => {
    if (mainnetBalance <= 0.001) {
      return '0';
    }
    return (mainnetBalance - 0.001).toFixed(6);
  };

  // Use abbreviated token mint address for display
  const getAbbreviatedMintAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  };

  // Add a new refresh function to update all balances
  const refreshBalances = () => {
    if (!publicKey) return;
    
    fetchMainnetBalance(publicKey);
    fetchTokenBalance(publicKey);
    fetchCredits(); // Also refresh credits
  };

  // Add convert tokens function
  const handleConvertTokens = async () => {
    if (!privateKey || !convertAmount || !publicKey) return;
    
    setConverting(true);
    setConvertError(null);
    setConvertSuccess(null);
    
    try {
      const amount = parseFloat(convertAmount);
      
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount');
      }
      
      if (amount > tokenBalance) {
        throw new Error('Insufficient token balance');
      }
      
      console.log('Starting token conversion process...');
      console.log('Using private key:', privateKey ? 'Yes (available)' : 'No (missing)');
      
      // Make sure we're logged in
      const session = await supabase.auth.getSession();
      console.log('Session check before converting:', !!session.data.session);
      
      // Call the API to convert tokens to credits
      const response = await fetch('/api/convert-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session?.access_token || ''}`,
        },
        body: JSON.stringify({
          amount,
          privateKey,
          walletAddress: publicKey,
        }),
        // Include credentials and specify SameSite attribute
        credentials: 'include',
      });
      
      // Check if response is actually received
      if (!response) {
        throw new Error('No response received from the server');
      }
      
      console.log('Response received:', response.status, response.statusText);
      
      // Try to parse JSON response safely
      let result;
      try {
        const text = await response.text();
        console.log('Raw response:', text);
        
        // Try to parse as JSON if it looks like JSON
        if (text.trim().startsWith('{')) {
          result = JSON.parse(text);
        } else {
          throw new Error('Response is not valid JSON');
        }
      } catch (jsonError) {
        console.error('Failed to parse response:', jsonError);
        throw new Error(`Failed to parse server response: ${response.status} ${response.statusText}`);
      }
      
      if (!response.ok) {
        console.error('Convert API error:', result);
        
        // More specific error handling
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log out and log back in to refresh your session.');
        } else if (result?.error && result.error.includes('uuid')) {
          throw new Error('User identification error. Please refresh the page and try again.');
        } else if (result?.error && result.error.includes('account to credit')) {
          throw new Error('Your wallet could not be linked to your account. Please ensure your wallet is properly set up.');
        } else {
          throw new Error(result?.error || `Error ${response.status}: ${response.statusText}`);
        }
      }
      
      console.log('Conversion successful:', result);
      
      // Update balances after successful conversion
      if (publicKey) {
        fetchTokenBalance(publicKey);
        fetchCredits();
      }
      
      // Display success message
      setConvertSuccess(`Successfully converted ${amount} NYSA tokens to credits!`);
      setConvertAmount('');
      
      // Close modal after a delay
      setTimeout(() => {
        setShowConvertModal(false);
        setConvertSuccess(null);
      }, 3000);
      
    } catch (error: any) {
      console.error('Error converting tokens:', error);
      setConvertError(error.message || 'An error occurred while converting tokens');
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 shadow rounded-lg p-6 text-gray-200 mb-6">
        <h2 className="text-xl font-semibold mb-6 text-white">Solana Wallet</h2>
        <div className="flex justify-center">
          <div className="animate-pulse text-gray-400">Loading wallet information...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 shadow rounded-lg p-6 text-gray-200 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">Solana Wallet</h2>
        <button 
          onClick={refreshBalances}
          className="text-blue-400 hover:text-blue-300"
          disabled={loadingBalance || loadingTokenBalance}
        >
          Refresh Balances
        </button>
      </div>
      
      {message && (
        <div className={`mb-4 p-3 rounded ${
          message.type === 'error' 
            ? 'bg-red-900 text-red-200' 
            : message.type === 'warning'
              ? 'bg-yellow-900 text-yellow-200'
              : 'bg-green-900 text-green-200'
        }`}>
          {message.text}
        </div>
      )}
      
      {!hasWallet ? (
        <div className="flex flex-col items-center">
          <p className="mb-4 text-center">You don't have a wallet yet. Create one to start using Solana blockchain features.</p>
          <button
            onClick={handleCreateWallet}
            disabled={creating}
            className="rounded-full bg-blue-500 text-white px-6 py-2 font-medium hover:bg-blue-600 transition-colors disabled:opacity-70 cursor-pointer"
          >
            {creating ? 'Creating Wallet...' : 'Create Wallet'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-200 mb-2">Wallet Address</h3>
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-gray-800 p-2 rounded break-all font-mono text-sm flex-1">
                {publicKey}
              </div>
              <CopyToClipboard text={publicKey || ''} onCopy={handleCopy}>
                <button className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded transition-colors" title="Copy to clipboard">
                  {copied ? 'Copied!' : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </CopyToClipboard>
              <div className="relative">
                <button 
                  onClick={() => setShowQR(!showQR)}
                  className={`${showQR ? 'bg-purple-700' : 'bg-purple-500 hover:bg-purple-600'} text-white p-2 rounded transition-colors`}
                  title="Show QR Code"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </button>
                {showQR && publicKey && (
                  <div 
                    ref={qrPopoverRef}
                    className="absolute right-0 top-10 bg-gray-800 p-3 rounded-lg shadow-lg z-10 border border-gray-700"
                  >
                    <div className="bg-white p-3 rounded-lg">
                      <QRCodeSVG value={publicKey} size={120} />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-400">This is your public key that can be shared with others.</p>
          </div>
          
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-200 mb-2">Balance (Mainnet)</h3>
            <div className="flex items-center gap-2">
              {loadingBalance ? (
                <div className="animate-pulse text-sm text-gray-400">Loading balance...</div>
              ) : balanceError ? (
                <div className="text-red-400 text-sm flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{balanceError}</span>
                  <button 
                    onClick={() => publicKey && fetchMainnetBalance(publicKey)}
                    className="ml-2 text-blue-400 hover:text-blue-300"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-2xl font-bold text-blue-400">{mainnetBalance}</span>
                  <span className="text-gray-300">SOL</span>
                </>
              )}
            </div>
          </div>
          
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-200 mb-2">{TOKEN_NAME} Token Balance</h3>
            <div className="flex items-center gap-2">
              {loadingTokenBalance ? (
                <div className="animate-pulse text-sm text-gray-400">Loading token balance...</div>
              ) : tokenBalanceError ? (
                <div className="text-red-400 text-sm flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{tokenBalanceError}</span>
                  <button 
                    onClick={() => publicKey && fetchTokenBalance(publicKey)}
                    className="ml-2 text-blue-400 hover:text-blue-300"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-2xl font-bold text-blue-400">{tokenBalance}</span>
                  <span className="text-gray-300">{TOKEN_NAME} ({getAbbreviatedMintAddress(SPL_TOKEN_MINT_ADDRESS)})</span>
                </>
              )}
            </div>
            
            {tokenBalance > 0 && (
              <div className="flex mt-2 justify-end">
                <button
                  onClick={() => setShowConvertModal(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                >
                  Convert to Credits
                </button>
              </div>
            )}
          </div>
          
          {/* Credits Display Section */}
          <div className="bg-gray-700 p-4 rounded-lg mt-4">
            <h3 className="text-lg font-medium text-gray-200 mb-2">NYSA Credits</h3>
            <div className="flex items-center">
              {loadingCredits ? (
                <div className="animate-pulse text-sm text-gray-400">Loading credits...</div>
              ) : (
                <>
                  <span className="text-2xl font-bold text-green-400">{credits}</span>
                  <span className="text-gray-300 ml-2">Credits</span>
                </>
              )}
            </div>
          </div>
          
          {/* Convert Modal */}
          {showConvertModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full">
                <h3 className="text-xl font-semibold text-white mb-4">Convert NYSA Tokens to Credits</h3>
                
                <p className="text-gray-300 mb-4">
                  You are about to convert your NYSA tokens to site credits. This action will burn your tokens permanently.
                  You will receive an equal amount of credits in your account.
                </p>
                
                <div className="mb-4">
                  <label className="block text-gray-300 mb-2">Amount to Convert</label>
                  <input
                    type="number"
                    value={convertAmount}
                    onChange={(e) => setConvertAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white"
                    max={tokenBalance}
                    min={0}
                  />
                  <div className="text-xs text-gray-400 mt-1 flex justify-between">
                    <span>Available: {tokenBalance} NYSA</span>
                    <button 
                      className="text-blue-400 hover:text-blue-300"
                      onClick={() => setConvertAmount(tokenBalance.toString())}
                    >
                      Max
                    </button>
                  </div>
                </div>
                
                {convertError && (
                  <div className="bg-red-500 bg-opacity-20 text-red-300 p-2 rounded mb-4">
                    {convertError}
                  </div>
                )}
                
                {convertSuccess && (
                  <div className="bg-green-500 bg-opacity-20 text-green-300 p-2 rounded mb-4">
                    {convertSuccess}
                  </div>
                )}
                
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowConvertModal(false)}
                    className="px-4 py-2 border border-gray-500 text-gray-300 rounded hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConvertTokens}
                    disabled={converting || !convertAmount || parseFloat(convertAmount) <= 0 || parseFloat(convertAmount) > tokenBalance}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    {converting ? 'Converting...' : 'Convert'}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Withdraw Section */}
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-200 mb-2">Withdraw</h3>
            
            {withdrawSuccess && (
              <div className="mb-4 p-3 rounded bg-green-900 text-green-200">
                {withdrawSuccess}
              </div>
            )}
            
            {withdrawError && (
              <div className="mb-4 p-3 rounded bg-red-900 text-red-200">
                {withdrawError}
              </div>
            )}
            
            <form onSubmit={handleWithdrawSubmit} className="space-y-3">
              <div>
                <label htmlFor="withdraw-amount" className="block text-sm font-medium text-gray-300 mb-1">
                  Amount (SOL)
                </label>
                <input
                  id="withdraw-amount"
                  type="number"
                  step="0.000001"
                  min="0.000001"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="E.g.: 0.1"
                  className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={withdrawing}
                />
                {mainnetBalance > 0 && (
                  <div className="mt-1 text-xs text-gray-400 flex justify-between">
                    <span>Current balance: {mainnetBalance} SOL</span>
                    <button 
                      type="button"
                      onClick={() => {
                        if (mainnetBalance <= 0.001) {
                          setWithdrawError('Insufficient balance for transaction fees (min 0.001 SOL required)');
                        } else {
                          setWithdrawAmount(getMaxWithdrawAmount());
                        }
                      }}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Withdraw Max
                    </button>
                  </div>
                )}
              </div>
              
              <div>
                <label htmlFor="withdraw-address" className="block text-sm font-medium text-gray-300 mb-1">
                  Recipient Address
                </label>
                <input
                  id="withdraw-address"
                  type="text"
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  placeholder="Solana wallet address"
                  className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={withdrawing}
                />
              </div>
              
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={withdrawing || loadingBalance || !mainnetBalance || mainnetBalance <= 0}
                  className="w-full rounded-md bg-purple-600 text-white px-4 py-2 font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {withdrawing ? 'Processing...' : 'Withdraw'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Confirmation Modal */}
      {showWithdrawConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-white mb-4">Confirm Transaction</h3>
            <p className="text-gray-300 mb-4">
              Are you sure you want to withdraw <span className="font-bold text-blue-400">{withdrawAmount} SOL</span>?
            </p>
            <p className="text-gray-300 mb-6">
              Recipient: <span className="font-mono text-sm break-all">{withdrawAddress}</span>
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={cancelWithdraw}
                className="flex-1 py-2 px-4 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeWithdraw}
                disabled={withdrawing}
                className="flex-1 py-2 px-4 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-70"
              >
                {withdrawing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 