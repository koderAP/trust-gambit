import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Force dynamic rendering for all API routes
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🔐 Login attempt for:', body.email)
    
    const { email, password } = loginSchema.parse(body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { lobby: true },
    });

    if (!user) {
      console.log('❌ User not found:', email)
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    console.log('✓ User found:', { id: user.id, email: user.email })

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    
    console.log('🔑 Password validation:', isValid ? '✓ Valid' : '❌ Invalid')
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    console.log('✅ Login successful:', { userId: user.id, email: user.email })

    return NextResponse.json({
      userId: user.id,
      lobbyId: user.lobbyId,
      name: user.name,
      email: user.email,
      profileComplete: user.profileComplete,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.log('❌ Validation error:', error.errors)
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      );
    }

    console.error('❌ Login error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    
    return NextResponse.json(
      { error: 'Login failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
