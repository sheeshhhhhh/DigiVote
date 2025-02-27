import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PollService } from './poll.service';
import { User, UserType } from 'src/lib/decorator/User.decorator';
import { JwtAuthGuard } from 'src/lib/guards/jwt-auth.guard';
import { CreatePollDto } from './dto/poll.dto';
import { AdminGuard } from 'src/lib/guards/admin.guard';
import { PollBranchGuard } from 'src/lib/guards/pollBranch.guard';

@UseGuards(JwtAuthGuard)
@Controller('poll')
export class PollController {
    constructor(
        private pollService: PollService
    ) {}

    @UseGuards(AdminGuard('polls', 'create'))
    @Post()
    async createPoll(@User() user: UserType, @Body() body: CreatePollDto) {
        return this.pollService.createPoll(user, body)
    }

    @Get()
    async getPolls(@User() user: UserType, @Query('search') search: string) {
        return this.pollService.getPolls(user, search)
    }

    @UseGuards(AdminGuard('adminDashboardStats', 'Get'))
    @Get('adminDashboard')
    async getAdminDashboard(@User() user: UserType) {
        return this.pollService.getAdminDashboard(user)
    }

    @UseGuards(AdminGuard('adminDashboardStats', 'Get'))
    @Get('adminDashboard/statistics')
    async getAdminDashboardStats(@User() user: UserType) {
        return this.pollService.getAdminDashboardStats(user)
    }

    @Get('results')
    async getResults(@User() user: UserType) {
        return this.pollService.getResults(user);
    }

    @Get('results/:id')
    async getPollResults(@User() user: UserType, @Param('id') pollId: string) {
        return this.pollService.getResult(user, pollId);
    }

    @Get('resultStats/:id')
    async getResultStats(@User() user: UserType, @Param('id') pollId: string) {
        return this.pollService.getResultStatistics(user, pollId);
    }
    
    @Get('getPollForVoting/:id')
    async getPollForVoting(@User() user: UserType, @Param('id') pollId: string) {
        return this.pollService.getPollForVoting(user, pollId);
    }

    @Get('pollStats/:id')
    async getPollStats(@User() user: UserType, @Param('id') pollId: string) {
        return this.pollService.getPollStatistics(user, pollId);
    }
    
    @Get('getInitialData/:id')
    async getInitialData(@User() user: UserType, @Param('id') pollId: string) {
        return this.pollService.getInitialData(user, pollId)
    }

    @Get(':id')
    async getPoll(@User() user: UserType, @Param('id') pollId: string) {
        return this.pollService.getPoll(user, pollId)
    }

    @UseGuards(AdminGuard('polls', 'update'))
    @UseGuards(PollBranchGuard('polls', 'update'))
    @Patch(':pollId')
    async updatePoll(@User() user: UserType, @Param('pollId') pollId: string, @Body() body: CreatePollDto) {
        return this.pollService.updatePoll(user, pollId, body)
    }

    @UseGuards(AdminGuard('polls', 'delete'))
    @UseGuards(PollBranchGuard('polls', 'delete'))
    @Delete(':pollId')
    async deletePoll(@User() user: UserType, @Param('pollId') pollId: string) {
        return this.pollService.deletePoll(user, pollId)
    }
}
