import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

import { ConfirmLogoutModal } from "@/components/auth/ConfirmLogoutModal";
import { Button } from "@/components/ui/button";
import { useConnectivityStatus } from "@/hooks/useConnectivityStatus";
import { useAuthStore } from "@/store/useAuthStore";

export function OnlineLogoutButton() {
  const online = useConnectivityStatus();
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!online) {
    return null;
  }

  const handleLogout = async () => {
    setBusy(true);
    try {
      await logout();
      setConfirmOpen(false);
      navigate("/login", { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => setConfirmOpen(true)}
        className="border-slate-200 bg-white/95 text-slate-800 shadow-sm backdrop-blur-sm hover:bg-slate-50"
      >
        <LogOut className="mr-1.5 h-4 w-4" aria-hidden />
        Cerrar sesión
      </Button>

      <ConfirmLogoutModal
        open={confirmOpen}
        confirming={busy}
        onCancel={() => {
          if (!busy) {
            setConfirmOpen(false);
          }
        }}
        onConfirm={() => void handleLogout()}
      />
    </>
  );
}
