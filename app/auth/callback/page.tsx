'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Verificar se há erro na URL
        const errorParam = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        if (errorParam) {
          console.error('OAuth error:', errorParam, errorDescription)
          setError(errorDescription || 'Erro na autenticação')
          return
        }

        // Tentar exchange code for session (PKCE flow)
        const code = searchParams.get('code')

        if (code) {
          console.log('Trocando código por sessão...')
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)

          if (error) {
            console.error('Erro ao trocar código:', error)
            setError('Erro ao completar login: ' + error.message)
            return
          }

          console.log('Login bem-sucedido:', data)
          router.push('/')
          return
        }

        // Se não tem code, verificar se há hash com access_token (implicit flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')

        if (accessToken) {
          console.log('Processando access_token do hash...')
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: hashParams.get('refresh_token') || '',
          })

          if (error) {
            console.error('Erro ao setar sessão:', error)
            setError('Erro ao completar login: ' + error.message)
            return
          }

          console.log('Login bem-sucedido via hash:', data)
          router.push('/')
          return
        }

        // Se não tem code nem access_token
        console.error('Nenhum code ou access_token encontrado na URL')
        setError('Parâmetros de autenticação não encontrados')
      } catch (err) {
        console.error('Erro inesperado no callback:', err)
        setError('Erro inesperado: ' + (err as Error).message)
      }
    }

    handleCallback()
  }, [searchParams, router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Não foi possível entrar</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Voltar para o login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completando login...</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
