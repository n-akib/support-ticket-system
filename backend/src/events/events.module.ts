import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsGateway } from './events.gateway';
import { Ticket } from '../tickets/entities/ticket.entity';

@Module({
  imports: [JwtModule, ConfigModule, TypeOrmModule.forFeature([Ticket])],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
