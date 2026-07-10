import { Controller, Get, Param, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../common/decorators/public.decorator";
import { TrackService } from "./track.service";

@Controller("track")
export class TrackController {
  constructor(private readonly trackService: TrackService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.trackService.findOne(id);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post(":id/approve")
  approveBudget(@Param("id") id: string) {
    return this.trackService.approveBudget(id);
  }
}
