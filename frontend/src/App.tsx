import { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { usePartyStore } from "./store/partyStore";
import { useThemeStore } from "./store/themeStore";
import { socket } from "./lib/socket";
import Home from "./pages/Home";
import PartyRoom from "./pages/PartyRoom";

function App() {
  const { party, setConnectionStatus, setError } = usePartyStore();
  const { resolvedTheme } = useThemeStore();
  const [isLoading, setIsLoading] = useState(true);

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [resolvedTheme]);

  useEffect(() => {
    // Handle connection status
    socket.on("connect", () => {
      setConnectionStatus("connected");
      toast.success("Connected to server");
    });

    socket.on("disconnect", (reason) => {
      setConnectionStatus("disconnected");
      if (reason === "io server disconnect") {
        toast.error("Disconnected by server");
      } else {
        toast.warning("Connection lost. Reconnecting...");
      }
    });

    socket.on("error", (message: string) => {
      setError(message);
      toast.error(message);
    });

    setIsLoading(false);

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("error");
    };
  }, [setConnectionStatus, setError]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-bold animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Toaster
        position="top-center"
        theme={resolvedTheme}
        toastOptions={{
          classNames: {
            toast: 'glass-toast',
            title: 'toast-title',
            description: 'toast-description',
            success: 'toast-success',
            error: 'toast-error',
            warning: 'toast-warning',
            info: 'toast-info',
          },
        }}
      />
      {party ? <PartyRoom /> : <Home />}
    </>
  );
}

export default App;
