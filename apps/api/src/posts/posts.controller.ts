import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ServiceNeed } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { BID_INCLUSIONS, BID_WINDOWS, INTERESTS, SERVICE_NEEDS } from '@sln/core';
import { Authenticated, CurrentUser, type SessionUser } from '../auth/auth.decorators';
import { PostsService } from './posts.service';

class CreatePostDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate must be YYYY-MM-DD' }) startDate: string;
  @IsInt() @Min(1) @Max(20) adults: number;
  @IsInt() @Min(0) @Max(10) children: number;
  @IsInt() @Min(0) @Max(200000) budgetMinUsd: number;
  @IsInt() @Min(0) @Max(200000) budgetMaxUsd: number;
  @IsIn(SERVICE_NEEDS.map((n) => n.id)) need: ServiceNeed;
  @IsArray() @ArrayMaxSize(INTERESTS.length) @IsIn(INTERESTS.map((i) => i.id), { each: true }) interests: string[];
  @IsArray() @ArrayMaxSize(6) @IsString({ each: true }) @MaxLength(30, { each: true }) languages: string[];
  @IsString() @MaxLength(1000) notes: string;
  @IsIn([...BID_WINDOWS]) deadlineHours: number;
}

class BidDto {
  @IsInt() @Min(10) @Max(200000) priceUsd: number;
  @IsArray() @ArrayMaxSize(BID_INCLUSIONS.length) @IsIn(BID_INCLUSIONS.map((i) => i.id), { each: true }) inclusions: string[];
  @IsString() @MinLength(10) @MaxLength(800) pitch: string;
  @IsBoolean() availabilityConfirmed: boolean;
}

class ScopeQuery {
  @IsOptional() @IsIn(['matching', 'all']) scope?: 'matching' | 'all';
}

/** A traveller posts a trip for bids, watches the bids arrive, or withdraws it. */
@Controller('trips/:tripId/post')
@Authenticated()
export class TripPostController {
  constructor(private readonly posts: PostsService) {}

  @Post()
  @HttpCode(201)
  create(@CurrentUser() u: SessionUser, @Param('tripId') tripId: string, @Body() dto: CreatePostDto) {
    return this.posts.createPost(u.id, tripId, dto);
  }

  @Get()
  get(@CurrentUser() u: SessionUser, @Param('tripId') tripId: string) {
    return this.posts.ownerPost(u.id, tripId);
  }

  @Delete()
  @HttpCode(204)
  withdraw(@CurrentUser() u: SessionUser, @Param('tripId') tripId: string) {
    return this.posts.withdraw(u.id, tripId);
  }
}

/** A verified provider's view of open requests and their own bids. */
@Controller('provider')
@Authenticated('GUIDE', 'COMPANY', 'TRANSPORT')
export class ProviderRequestsController {
  constructor(private readonly posts: PostsService) {}

  @Get('requests')
  list(@CurrentUser() u: SessionUser, @Query() q: ScopeQuery) {
    return this.posts.requests(u.id, q.scope ?? 'matching');
  }

  @Get('requests/:postId')
  one(@CurrentUser() u: SessionUser, @Param('postId') postId: string) {
    return this.posts.request(u.id, postId);
  }

  @Put('requests/:postId/bid')
  bid(@CurrentUser() u: SessionUser, @Param('postId') postId: string, @Body() dto: BidDto) {
    return this.posts.placeBid(u.id, postId, dto);
  }

  @Delete('requests/:postId/bid')
  @HttpCode(204)
  withdraw(@CurrentUser() u: SessionUser, @Param('postId') postId: string) {
    return this.posts.withdrawBid(u.id, postId);
  }

  @Get('bids')
  mine(@CurrentUser() u: SessionUser) {
    return this.posts.myBids(u.id);
  }
}
