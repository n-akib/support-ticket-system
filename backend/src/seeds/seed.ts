import * as bcrypt from 'bcrypt';
import AppDataSource from '../data-source';
import { User, UserRole } from '../users/entities/user.entity';
import { Ticket, TicketPriority, TicketStatus } from '../tickets/entities/ticket.entity';
import { Comment } from '../comments/entities/comment.entity';

async function seed() {
  console.log('Starting database seeding...');
  await AppDataSource.initialize();

  const userRepo = AppDataSource.getRepository(User);
  const ticketRepo = AppDataSource.getRepository(Ticket);
  const commentRepo = AppDataSource.getRepository(Comment);

  const defaultPassword = 'Password123!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // 1. Seed Demo Users
  const usersToSeed = [
    {
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash,
      role: UserRole.ADMIN,
    },
    {
      name: 'Support Agent',
      email: 'agent@example.com',
      passwordHash,
      role: UserRole.AGENT,
    },
    {
      name: 'Jane Customer',
      email: 'customer@example.com',
      passwordHash,
      role: UserRole.CUSTOMER,
    },
  ];

  const seededUsers: Record<string, User> = {};

  for (const u of usersToSeed) {
    let user = await userRepo.findOne({ where: { email: u.email } });
    if (!user) {
      user = userRepo.create(u);
      user = await userRepo.save(user);
      console.log(`  ✓ Created user: ${user.name} (${user.role}) - ${user.email}`);
    } else {
      console.log(`  ℹ User already exists: ${user.name} (${user.role})`);
    }
    seededUsers[u.role] = user;
  }

  const admin = seededUsers[UserRole.ADMIN];
  const agent = seededUsers[UserRole.AGENT];
  const customer = seededUsers[UserRole.CUSTOMER];

  const now = new Date();

  // 2. Seed Sample Tickets
  const ticketsToSeed = [
    {
      title: 'Cannot download VAT invoice for September',
      description: 'When I go to Billing -> Invoices and click download PDF, it shows a blank page.',
      status: TicketStatus.OPEN,
      priority: TicketPriority.MEDIUM,
      category: 'billing',
      createdById: customer.id,
      assignedToId: null,
      dueAt: new Date(now.getTime() + 48 * 60 * 60 * 1000), // +48h
    },
    {
      title: 'Production API throwing intermittent 504 Gateway Timeout',
      description: 'Our webhooks are failing with 504 status codes during peak traffic hours.',
      status: TicketStatus.IN_PROGRESS,
      priority: TicketPriority.HIGH,
      category: 'technical',
      createdById: customer.id,
      assignedToId: agent.id,
      dueAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // +24h
    },
    {
      title: 'Urgent: SSO login loop on mobile devices',
      description: 'Employees are stuck in a redirect loop after entering their Google credentials on iOS.',
      status: TicketStatus.OPEN,
      priority: TicketPriority.URGENT,
      category: 'account',
      createdById: customer.id,
      assignedToId: null,
      dueAt: new Date(now.getTime() - 6 * 60 * 60 * 1000), // Overdue (-6h)
    },
    {
      title: 'Clarification on API rate limits for Enterprise plan',
      description: 'Does the Enterprise plan support 5,000 requests per minute or 10,000?',
      status: TicketStatus.RESOLVED,
      priority: TicketPriority.LOW,
      category: 'general',
      createdById: customer.id,
      assignedToId: agent.id,
      dueAt: new Date(now.getTime() + 72 * 60 * 60 * 1000), // +72h
    },
    {
      title: 'Update company registered billing address',
      description: 'Please update our registered business address to 123 Tech Park, Suite 400.',
      status: TicketStatus.CLOSED,
      priority: TicketPriority.LOW,
      category: 'billing',
      createdById: customer.id,
      assignedToId: agent.id,
      dueAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
    },
  ];

  for (const t of ticketsToSeed) {
    let ticket = await ticketRepo.findOne({ where: { title: t.title } });
    if (!ticket) {
      ticket = ticketRepo.create(t);
      ticket = await ticketRepo.save(ticket);
      console.log(`  ✓ Created ticket: [${ticket.status.toUpperCase()}] "${ticket.title}"`);

      // Seed discussion comments on the in-progress ticket
      if (t.status === TicketStatus.IN_PROGRESS) {
        await commentRepo.save(
          commentRepo.create({
            ticketId: ticket.id,
            authorId: agent.id,
            body: 'Investigating server load on cluster node 3. We noticed high memory pressure during peak webhook dispatching.',
          }),
        );
        await commentRepo.save(
          commentRepo.create({
            ticketId: ticket.id,
            authorId: customer.id,
            body: 'Thanks for the quick response. Issue started around 08:00 AM UTC today.',
          }),
        );
        console.log(`    ↳ Added 2 discussion comments`);
      }
    } else {
      console.log(`  ℹ Ticket already exists: "${ticket.title}"`);
    }
  }

  console.log('\n Database seeding completed successfully!');
  console.log('--------------------------------------------------');
  console.log('Demo Credentials (password for all: Password123!):');
  console.log(`  • Admin:    ${admin.email}`);
  console.log(`  • Agent:    ${agent.email}`);
  console.log(`  • Customer: ${customer.email}`);
  console.log('--------------------------------------------------');

  await AppDataSource.destroy();
}

seed().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
