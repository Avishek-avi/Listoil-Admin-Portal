"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    if (!username || !password) {
      setError("Please enter both username and password")
      setLoading(false)
      return
    }

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
      } else {
        router.push("/dashboard")
      }
    } catch {
      setError("An error occurred during login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundColor: "#D6001C",
        backgroundImage: `
          radial-gradient(circle at 50% 50%, rgba(255, 45, 74, 0.4) 0%, transparent 70%),
          radial-gradient(circle at 50% 50%, #D6001C 0%, #8b0000 100%)
        `,
        fontFamily: "var(--font-sans), sans-serif",
      }}
    >
      {/* Central glow focus */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Artistic vignette and framing elements */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-white/5 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-15%] left-[-5%] w-[30rem] h-[30rem] bg-black/30 rounded-full blur-[120px]" />

      {/* Subtle edge vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] pointer-events-none" />



      {/* Login card */}
      <div className="relative z-10 w-full max-w-md mx-auto px-4">
        <div
          className="rounded-2xl overflow-hidden p-8"
          style={{
            background: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.4)",
          }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <img
              src="https://listoil.com/wp-content/uploads/2023/05/listoil.com-logo.png"
              alt="Listoil Logo"
              className="h-16 mx-auto mb-4"
            />
            <h1 className="text-2xl font-semibold text-gray-800">
              Admin Portal – Listoil Loyalty
            </h1>
            <p className="text-gray-400 mt-1">
              Sign in to access your dashboard
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-500 mb-2"
              >
                Username
              </label>
              <input
                type="text"
                id="username"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="block w-full px-3 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
              />

            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-500 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="block w-full px-3 pr-10 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                />
                <div className="absolute inset-y-0 right-0 w-12 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-700"
                  >
                    <i
                      className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-red-600 rounded focus:ring-red-500"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-gray-500"
                >
                  Remember me
                </label>
              </div>
              <a
                href="#"
                className="text-sm font-medium text-red-600 hover:text-red-800"
              >
                Forgot password?
              </a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg font-medium text-white transition disabled:opacity-60 shadow-lg shadow-red-200"
              style={{
                background: loading
                  ? "#fca5a5"
                  : "linear-gradient(to right, #D6001C, #be123c)",
              }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">
              © 2026 Listoil Loyalty Program. All rights reserved.
              <br />
              Evolve Brands Pvt. Ltd., Gurgaon
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
