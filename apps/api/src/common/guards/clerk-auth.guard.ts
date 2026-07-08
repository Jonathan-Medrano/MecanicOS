import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { verifyToken, createClerkClient } from "@clerk/backend";
import { ConfigService } from "@nestjs/config";
import { WorkshopsService } from "../../workshops/workshops.service";
import { PrismaService } from "../../prisma/prisma.service";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { ALL_PERMISSIONS } from "../permissions";
import type { Request } from "express";

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(
    private config: ConfigService,
    private workshopsService: WorkshopsService,
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException();

    let userId: string;
    try {
      const payload = await verifyToken(token, {
        secretKey: this.config.getOrThrow("CLERK_SECRET_KEY"),
      });
      userId = payload.sub;
    } catch {
      throw new UnauthorizedException();
    }

    // 1. Owner — has their own Workshop
    const workshop = await this.prisma.workshop.findUnique({
      where: { clerkOrgId: userId },
    });
    if (workshop) {
      (request as any).auth = {
        clerkUserId: userId,
        workshopId: workshop.id,
        permissions: ALL_PERMISSIONS,
        isOwner: true,
      };
      return true;
    }

    // 2. Employee — already linked (clerkUserId set)
    const linkedEmployee = await this.prisma.workshopEmployee.findUnique({
      where: { clerkUserId: userId },
    });
    if (linkedEmployee) {
      (request as any).auth = {
        clerkUserId: userId,
        workshopId: linkedEmployee.workshopId,
        permissions: linkedEmployee.permissions,
        isOwner: false,
      };
      return true;
    }

    // 3. Pending employee — first login, link by email via Clerk API
    try {
      const clerk = createClerkClient({
        secretKey: this.config.getOrThrow("CLERK_SECRET_KEY"),
      });
      const clerkUser = await clerk.users.getUser(userId);
      const email = clerkUser.emailAddresses[0]?.emailAddress;
      if (email) {
        const pending = await this.prisma.workshopEmployee.findFirst({
          where: { email, clerkUserId: null },
        });
        if (pending) {
          const updated = await this.prisma.workshopEmployee.update({
            where: { id: pending.id },
            data: { clerkUserId: userId },
          });
          (request as any).auth = {
            clerkUserId: userId,
            workshopId: updated.workshopId,
            permissions: updated.permissions,
            isOwner: false,
          };
          return true;
        }
      }
    } catch {
      // Clerk API call failed — treat as new user (can't verify pending employee)
    }

    // 4. New user — create workshop (becomes owner)
    const newWorkshop = await this.workshopsService.findOrCreate(userId);
    (request as any).auth = {
      clerkUserId: userId,
      workshopId: newWorkshop.id,
      permissions: ALL_PERMISSIONS,
      isOwner: true,
    };
    return true;
  }

  private extractToken(request: Request): string | null {
    const auth = request.headers.authorization;
    if (!auth?.startsWith("Bearer ")) return null;
    return auth.slice(7);
  }
}
