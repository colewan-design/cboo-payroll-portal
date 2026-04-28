import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type PropsWithChildren,
} from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

type NetworkContextType = {
  isOnline: boolean;
  isInternetReachable: boolean | null;
};

const NetworkContext = createContext<NetworkContextType>({
  isOnline: true,
  isInternetReachable: null,
});

export function NetworkProvider({ children }: PropsWithChildren) {
  const [isOnline, setIsOnline] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(null);

  useEffect(() => {
    // Fetch current state immediately on mount
    NetInfo.fetch().then(handleState);

    // Subscribe to future changes
    const unsub = NetInfo.addEventListener(handleState);
    return unsub;
  }, []);

  function handleState(state: NetInfoState) {
    setIsOnline(!!state.isConnected);
    setIsInternetReachable(state.isInternetReachable);
  }

  return (
    <NetworkContext.Provider value={{ isOnline, isInternetReachable }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}
