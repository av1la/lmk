import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { User, UserRole } from '@/domains/user/UserDomain';
import { createUserService } from '@/domains/user/UserService';

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Missing webhook secret' }, { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing headers' }, { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(webhookSecret);

  let evt: Record<string, any>;

  try {
    evt = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as Record<string, any>;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const eventType = evt.type;

  const userService = createUserService();

  try {
    switch (eventType) {
      case 'user.created':
        await handleUserCreated(evt.data, userService);
        break;
      case 'user.updated':
        await handleUserUpdated(evt.data, userService);
        break;
      case 'user.deleted':
        await handleUserDeleted(evt.data, userService);
        break;
      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return NextResponse.json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleUserCreated(clerkUser: Record<string, any>, userService: any) {
  try {
    const existingUser = await userService.findByClerkId(clerkUser.id);
    
    if (!existingUser) {
      // Get primary email or first available email
      const primaryEmail = clerkUser.email_addresses?.find((email: any) => 
        email.id === clerkUser.primary_email_address_id
      );
      const email = primaryEmail?.email_address || 
                   clerkUser.email_addresses?.[0]?.email_address || 
                   `${clerkUser.id}@clerk.user`;

      const user: User = {
        clerkId: clerkUser.id,
        name: `${clerkUser.first_name || ''} ${clerkUser.last_name || ''}`.trim() || 
              clerkUser.username || 
              'User',
        email: email,
        image: clerkUser.image_url || clerkUser.profile_image_url,
        roles: [UserRole.USER],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await userService.create(user);
      console.log(`User created: ${user.email} (${user.name})`);
    }
  } catch (error) {
    console.error('Error creating user:', error);
    // Don't throw - webhook should still return success to avoid retries
  }
}

async function handleUserUpdated(clerkUser: Record<string, any>, userService: any) {
  try {
    const existingUser = await userService.findByClerkId(clerkUser.id);
    
    if (existingUser) {
      // Get primary email or first available email
      const primaryEmail = clerkUser.email_addresses?.find((email: any) => 
        email.id === clerkUser.primary_email_address_id
      );
      const email = primaryEmail?.email_address || 
                   clerkUser.email_addresses?.[0]?.email_address || 
                   existingUser.email; // Keep existing email if none found

      const updatedUserData = {
        name: `${clerkUser.first_name || ''} ${clerkUser.last_name || ''}`.trim() || 
              clerkUser.username || 
              existingUser.name,
        email: email,
        image: clerkUser.image_url || clerkUser.profile_image_url,
        updatedAt: new Date()
      };

      await userService.updateByClerkId(clerkUser.id, updatedUserData);
      console.log(`User updated: ${updatedUserData.email} (${updatedUserData.name})`);
    }
  } catch (error) {
    console.error('Error updating user:', error);
  }
}

async function handleUserDeleted(clerkUser: Record<string, any>, userService: any) {
  try {
    await userService.deleteByClerkId(clerkUser.id);
    console.log(`User deleted: ${clerkUser.id}`);
  } catch (error) {
    console.error('Error deleting user:', error);
  }
}