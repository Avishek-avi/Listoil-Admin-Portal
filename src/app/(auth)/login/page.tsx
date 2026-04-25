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
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat bg-fixed relative"
      style={{
        backgroundImage:
          "url('https://ik.imagekit.io/ewxcertfq/UE9tZVRRbWZFbjhITUdhcGxjS0VoZz09.webp')",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Dark overlay */}
      <div className="fixed inset-0 bg-black/28 pointer-events-none z-0" />

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md mx-auto px-4">
        <div
          className="rounded-2xl overflow-hidden p-8"
          style={{
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
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
                className="block w-full px-3 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
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
                  className="block w-full px-3 pr-10 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
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
                  className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
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
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Forgot password?
              </a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg font-medium text-white transition disabled:opacity-60"
              style={{
                background: loading
                  ? "#93c5fd"
                  : "linear-gradient(to right, #2563eb, #1d4ed8)",
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