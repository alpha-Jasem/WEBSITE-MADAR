import { useState, type FormEvent } from "react";
import "@dv3/css/globals.css";
import { Card } from "@dv3/components/ui/card";
import { useNavigate, useSearchParams } from "react-router";
import { Input } from "@dv3/components/ui/input";
import { Label } from "@dv3/components/ui/label";
import { Button } from "@dv3/components/ui/button";
import FullLogo from "@dv3/layouts/full/shared/logo/FullLogo";
import { supabase } from "@/lib/supabase";

const BoxedLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = (() => {
    const r = searchParams.get("redirect");
    return r?.startsWith("/clinic-os/") ? r : "/clinic-os/dashboard";
  })();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("أدخل البريد الإلكتروني وكلمة المرور.");
      return;
    }
    setLoading(true);
    setError("");
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (loginError) {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
      setLoading(false);
      return;
    }
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      navigate(`/clinic-os/mfa-challenge?redirect=${encodeURIComponent(redirectTo)}`, { replace: true });
      return;
    }
    navigate(redirectTo, { replace: true });
  };

  return (
    <>
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-accent  px-4">
        <Card className="w-full max-w-md border-none shadow-lg p-6">
          {/* Logo */}
          <div className="mx-auto  w-fit">
            <FullLogo />
          </div>

          <form onSubmit={handleLogin} className="space-y-6 w-full mt-4">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-sm font-normal text-muted-foreground"
                >
                  البريد الإلكتروني
                </Label>
                <Input
                  id="email"
                  type="email"
                  dir="ltr"
                  placeholder="email@clinic.sa"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="password"
                  className="text-sm font-normal text-muted-foreground"
                >
                  كلمة المرور
                </Label>
                <Input
                  id="password"
                  type="password"
                  dir="ltr"
                  placeholder="أدخل كلمة المرور"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  required
                />
              </div>
              <div className="flex items-center justify-end text-sm">
                <a
                  href="/forgot-password"
                  className=" text-sm font-medium hover:underline underline-offset-4 transition-all"
                >
                  هل نسيت كلمة المرور؟
                </a>
              </div>
            </div>
            {error && (
              <div className="text-sm text-destructive text-center">{error}</div>
            )}
            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full rounded-lg"
            >
              {loading ? "جاري الدخول..." : "دخول لوحة العيادة"}
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
};

export default BoxedLogin;
