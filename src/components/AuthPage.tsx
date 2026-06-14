import { useState } from "react";
import { supabase } from "../lib/supabase";
import { BookOpen, Loader2 } from "lucide-react";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);

  const handleSubmit = async () => {
    if (!email || !password) {
      setMessage({ text: "Email dan password wajib diisi.", type: "error" });
      return;
    }
    setLoading(true);
    setMessage(null as any);;

    if (mode === "register") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage({ text: error.message, type: "error" });
      else setMessage({ text: "Akun berhasil dibuat! Silakan login.", type: "success" });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage({ text: "Email atau password salah.", type: "error" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
            <BookOpen className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">VocabCards</h1>
            <p className="text-xs text-gray-500">Daily English Builder</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-1">
          {mode === "login" ? "Selamat datang kembali!" : "Buat akun baru"}
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          {mode === "login"
            ? "Login untuk melanjutkan progress belajarmu."
            : "Daftar gratis dan mulai belajar kosakata."}
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="email@example.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Minimal 6 karakter"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {message && (
            <div className={`text-sm px-4 py-3 rounded-xl ${
              message.type === "error" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
            }`}>
              {message.text}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === "login" ? "Login" : "Daftar"}
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          {mode === "login" ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
          <button
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setMessage(null as any);; }}
            className="text-blue-600 font-semibold hover:underline"
          >
            {mode === "login" ? "Daftar" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}