import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Eye, EyeOff, Lock, Mail, AlertCircle, ArrowRight, X } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().min(1, 'Email address is required').email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [accountMissing, setAccountMissing] = useState(false);
  const [lastAttemptedEmail, setLastAttemptedEmail] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';

  const onSubmit = async (data: LoginFormData) => {
    setAuthError(null);
    setAccountMissing(false);
    const enteredEmail = data.email.trim();
    setLastAttemptedEmail(enteredEmail);

    try {
      await login(data);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials. Please try again.';
      const lower = msg.toLowerCase();
      const isMissing =
        lower.includes('no account found') ||
        lower.includes('account does not exist') ||
        lower.includes('not found') ||
        lower.includes('create an account') ||
        lower.includes('create a new account');

      setAuthError(msg);
      setAccountMissing(isMissing);
    }
  };



  return (
    <div className="w-full rounded-2xl bg-white border border-[#D9D9D9] p-6 sm:p-7 shadow-xl space-y-5">
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-[#1D2226] tracking-tight">Sign in to CareerX</h1>
        <p className="text-xs text-[#56687A]">
          Enter your credentials to access your tracking and learning dashboard.
        </p>
      </div>

      {/* Red Line Alert when user does not exist */}
      {accountMissing && (
        <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] border-l-4 border-l-[#DC2626] text-[#991B1B] flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-200 shadow-sm">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#DC2626] flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <p className="font-bold text-[#991B1B]">User does not exist.</p>
              <p className="text-[11px] text-[#B91C1C]">
                No account found for <span className="font-semibold text-[#7F1D1D] underline decoration-[#FCA5A5]">{lastAttemptedEmail}</span>. Please create a new account to continue.
              </p>
            </div>
          </div>
          <Link
            to={`/register?email=${encodeURIComponent(lastAttemptedEmail)}`}
            state={{ email: lastAttemptedEmail }}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-[#DC2626] text-white hover:bg-[#B91C1C] transition flex-shrink-0 shadow-sm self-start sm:self-center"
          >
            <span>Create a new account</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Standard Error Alert */}
      {authError && !accountMissing && (
        <div className="p-3 rounded-xl bg-[#FCE8E6] border border-[#f8cbc7] border-l-4 border-l-[#B3261E] text-xs text-[#B3261E] flex items-start gap-2.5 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 text-[#B3261E] flex-shrink-0 mt-0.5" />
          <span className="leading-relaxed font-medium">{authError}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <Input
          label="Email Address"
          type="email"
          placeholder="name@workmail.com"
          icon={<Mail className="w-3.5 h-3.5" />}
          error={errors.email?.message || (accountMissing ? 'User does not exist. Create a new account.' : undefined)}
          {...register('email', {
            onChange: () => {
              if (accountMissing) setAccountMissing(false);
              if (authError) setAuthError(null);
            },
          })}
        />

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-[#1D2226]">Password</label>
            <Link
              to="/forgot-password"
              className="text-[11px] text-[#0A66C2] hover:text-[#004182] transition"
            >
              Forgot password?
            </Link>
          </div>

          <div className="relative rounded-lg">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#788896]">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className={`w-full bg-white text-[#1D2226] placeholder-[#788896] text-sm rounded-lg border pl-9 pr-10 py-2 transition focus:outline-none focus:ring-1 focus:ring-[#0A66C2] ${
                errors.password ? 'border-rose-500' : 'border-[#D9D9D9] hover:border-[#0A66C2]/40'
              }`}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#788896] hover:text-[#1D2226]"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-[#B3261E] font-medium">{errors.password.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full"
          loading={isSubmitting}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          Sign In
        </Button>
      </form>



      {/* Link to Register */}
      <div className="pt-2 text-center text-xs text-[#56687A]">
        Don't have an account yet?{' '}
        <Link to="/register" className="font-semibold text-[#0A66C2] hover:text-[#004182] transition">
          Create an account
        </Link>
      </div>

      {accountMissing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAccountMissing(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white border border-[#D9D9D9] p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-4"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="account-missing-title"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-red-100 p-2.5 text-[#DC2626] flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="account-missing-title" className="text-base font-bold text-[#1D2226]">
                    User does not exist
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-[#56687A]">
                    No account was found for{' '}
                    <span className="font-semibold text-[#1D2226] break-all">
                      {lastAttemptedEmail || 'this email address'}
                    </span>
                    . Would you like to create a new account now?
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAccountMissing(false)}
                className="rounded-lg p-1 text-[#788896] hover:bg-[#F3F6F8] hover:text-[#1D2226] transition"
                aria-label="Close alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAccountMissing(false)}
                className="w-1/2 py-2 px-3 text-xs font-semibold rounded-lg border border-[#D9D9D9] text-[#56687A] hover:bg-[#F3F6F8] transition"
              >
                Try Again
              </button>
              <Link
                to={`/register?email=${encodeURIComponent(lastAttemptedEmail)}`}
                state={{ email: lastAttemptedEmail }}
                onClick={() => setAccountMissing(false)}
                className="w-1/2"
              >
                <Button type="button" variant="primary" size="sm" className="w-full !bg-[#DC2626] hover:!bg-[#B91C1C]">
                  Create new account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
