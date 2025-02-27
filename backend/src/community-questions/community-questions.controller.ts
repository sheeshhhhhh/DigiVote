import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { User, UserType } from 'src/lib/decorator/User.decorator';
import { JwtAuthGuard } from 'src/lib/guards/jwt-auth.guard';
import { CommunityQuestionsService } from './community-questions.service';
import { CreateAnswerDto } from './dto/answer.dto';
import { CreateQuestionDto } from './dto/questions.dto';

@UseGuards(JwtAuthGuard)
@Controller('community-questions')
export class CommunityQuestionsController {
    constructor(
        private readonly communityQuestionsService: CommunityQuestionsService,
    ) {}

    @Post('createQuestion')
    async createCommunityQuestion(@User() user: UserType, @Body() body: CreateQuestionDto) {
        return this.communityQuestionsService.createCommunityQuestion(user, body);
    }

    @Get('getQuestions')
    async getCommunityQuestions(@User() user: UserType, @Query() query: { search: string }) {
        return this.communityQuestionsService.getCommunityQuestions(user, query);
    }

    @Patch('updateQuestion/:questionId')
    async updateCommunityQuestion(@User() user: UserType, @Body() body: CreateQuestionDto, @Param('questionId') questionId: number) {
        return this.communityQuestionsService.updateCommunityQuestion(user, questionId, body);
    }

    @Delete('deleteQuestion/:questionId')
    async deleteCommunityQuestion(@User() user: UserType, @Param('questionId') questionId: number) {
        return this.communityQuestionsService.deleteCommunityQuestion(user, questionId);
    }

    // answers
    @Post('createAnswer/:questionId')
    async createCommunityAnswer(@User() user: UserType, @Body() body: CreateAnswerDto, @Param('questionId') questionId: number) {
        return this.communityQuestionsService.createCommunityAnswer(user, questionId, body);
    }
    
    @Patch('updateAnswer/:answerId')
    async updateCommunityAnswer(@User() user: UserType, @Body() body: CreateAnswerDto, @Param('answerId') answerId: number) {
        return this.communityQuestionsService.updateCommunityAnswer(user, answerId, body);
    }

    @Delete('deleteAnswer/:answerId')
    async deleteCommunityAnswer(@User() user: UserType, @Param('answerId') answerId: string) {
        return this.communityQuestionsService.deleteCommunityAnswer(user, answerId);
    }

    // likes
    @Post('likeAnswer/:answerId')
    async likeAnswer(@User() user: UserType, @Param('answerId') answerId: string) {
        return this.communityQuestionsService.likeAnswer(user, answerId);
    }

    @Delete('unlikeAnswer/:answerId')
    async unlikeAnswer(@User() user: UserType, @Param('answerId') answerId: string) {
        return this.communityQuestionsService.unlikeAnswer(user, answerId);
    }
}
