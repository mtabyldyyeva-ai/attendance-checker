import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

    // If env vars are missing, return response as is
    if (!supabaseUrl || !supabaseKey) {
        return response
    }

    try {
        const supabase = createServerClient(
            supabaseUrl,
            supabaseKey,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll()
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value }) =>
                            request.cookies.set(name, value)
                        )
                        response = NextResponse.next({
                            request,
                        })
                        cookiesToSet.forEach(({ name, value, options }) =>
                            response.cookies.set(name, value, options)
                        )
                    },
                },
            }
        )

        const { data: { user } } = await supabase.auth.getUser()

        const isLoginPage = request.nextUrl.pathname.startsWith('/login')
        const isAuthPage = request.nextUrl.pathname.startsWith('/auth')

        if (!user && !isLoginPage && !isAuthPage) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }

        // Role-based route protection
        if (user) {
            const role = user.user_metadata?.role as string | undefined
            const pathname = request.nextUrl.pathname

            const roleRouteMap: Record<string, string> = {
                '/admin': 'admin',
                '/teacher': 'teacher',
                '/student': 'student',
            }

            for (const [routePrefix, requiredRole] of Object.entries(roleRouteMap)) {
                if (pathname.startsWith(routePrefix) && role !== requiredRole) {
                    // Redirect to the user's correct dashboard
                    const url = request.nextUrl.clone()
                    if (role === 'admin') url.pathname = '/admin'
                    else if (role === 'teacher') url.pathname = '/teacher'
                    else if (role === 'student') url.pathname = '/student'
                    else url.pathname = '/login'
                    return NextResponse.redirect(url)
                }
            }
        }

        return response
    } catch (e) {
        console.error('Middleware Error:', e)
        return NextResponse.next({
            request: {
                headers: request.headers,
            },
        })
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
