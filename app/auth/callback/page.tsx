'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientBrowser } from '@/lib/supabase'
import { loginWithGoogle } from '@/app/actions'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClientBrowser()

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
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

          if (exchangeError) {
            console.error('Erro ao trocar código:', exchangeError)
            setError('Erro ao completar login: ' + exchangeError.message)
            return
          }

          console.log('Login Supabase bem-sucedido:', data)
        } else {
          // Se não tem code, verificar se há hash com access_token (implicit flow)
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const accessToken = hashParams.get('access_token')

          if (accessToken) {
            console.log('Processando access_token do hash...')
            const { data, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: hashParams.get('refresh_token') || '',
            })

            if (sessionError) {
              console.error('Erro ao setar sessão:', sessionError)
              setError('Erro ao completar login: ' + sessionError.message)
              return
            }

            console.log('Login Supabase bem-sucedido via hash:', data)
          } else {
            console.error('Nenhum code ou access_token encontrado na URL')
            setError('Parâmetros de autenticação não encontrados')
            return
          }
        }

        // Recuperar a sessão criada pelo OAuth para autenticar o usuário
        // também no sistema interno do FaturApp.
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !sessionData.session?.access_token) {
          console.error('Erro ao recuperar sessão OAuth:', sessionError)
          setError('Não foi possível concluir sua sessão Google.')
          return
        }

        const accessToken = sessionData.session.access_token
        console.log('Validando usuário Google no FaturApp...')
        const result = await loginWithGoogle(accessToken)

        if (!result.success) {
          console.error('Erro ao criar sessão do FaturApp:', result.error)
          setError(result.error || 'Não foi possível criar sua conta com Google.')
          await supabase.auth.signOut()
          return
        }

        console.log('Login Google concluído com sucesso:', result)
        await supabase.auth.signOut()
        router.replace('/')
        router.refresh()
      } catch (err) {
        console.error('Erro inesperado no callback:', err)
        setError('Erro inesperado: ' + (err instanceof Error ? err.message : String(err)))
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
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  )
}
