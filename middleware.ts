// import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    // TEMPORARY DEBUGGING: Bypass all Supabase logic to verify Edge Runtime health
    console.log('Middleware executing for:', request.nextUrl.pathname)
    return NextResponse.next()
    /*
        try {
            let response = NextResponse.next({
                request: {
                    headers: request.headers,
                },
            })
    
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
            const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
    
            if (!supabaseUrl || !supabaseKey) {
                console.error('Middleware Error: Missing Supabase environment variables')
                return response
            }
    
            const supabase = createServerClient(
                supabaseUrl,
                supabaseKey,
                {
                    cookies: {
                        getAll() {
                            return request.cookies.getAll()
                        },
                        setAll(cookiesToSet) {
                            cookiesToSet.forEach(({ name, value, options }) =>
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
    
            // This will refresh session if needed
            const { data: { user } } = await supabase.auth.getUser()
    
            if (
                !user &&
                !request.nextUrl.pathname.startsWith('/login') &&
                !request.nextUrl.pathname.startsWith('/auth')
            ) {
                const url = request.nextUrl.clone()
                url.pathname = '/login'
                return NextResponse.redirect(url)
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
    */
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
