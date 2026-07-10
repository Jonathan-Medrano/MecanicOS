import { Controller, Get, Param } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";
import { TrackService } from "./track.service";

@Controller("track")
export class TrackController {
  constructor(private readonly trackService: TrackService) {}

  @Public()
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.trackService.findOne(id);
  }
}
