import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from 'src/lib/guards/local-auth.guard';
import { ForgotPasswordDto, RegistrationAdminDto, RegistrationUserDto, ResetPasswordDto } from './dto/auth.dto';
import { JwtAuthGuard } from 'src/lib/guards/jwt-auth.guard';
import { User, UserType } from 'src/lib/decorator/User.decorator';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService
    ) {}

    @UseGuards(LocalAuthGuard)
    @Post('login')
    async login(@Request() req) {
        return this.authService.login(req.user);
    }

    @Post('register')
    async register(@Body() body: RegistrationUserDto) {
        return this.authService.RegistrationUser(body)
    }

    @Post('registerAdmin')
    async registerAdmin(@Body() body: RegistrationAdminDto) {
        return this.authService.RegistrationAdmin(body)
    }

    @Post('verifyEmail')
    async verifyEmail(@Body() body: { token: string, email: string }) {
        return this.authService.verifyEmail(body.token, body.email)
    }

    @Post('resendEmail')
    async resendEmail(@Body() body: { email: string }) {
        return this.authService.resendEmail(body.email)
    }

    @Post('refreshToken')
    async refreshToken(@Body() body: any) {
        return this.authService.refreshToken(body.refreshToken)
    }

    @Post('forgot-password')
    async forgotPassword(@Body() body: ForgotPasswordDto) {
        return this.authService.forgotPassword(body)
    }

    @Post('reset-password')
    async resetPassword(@Body() body: ResetPasswordDto) {
        return this.authService.resetPassword(body);
    }

    @UseGuards(JwtAuthGuard)
    @Get('check')
    async checkUser(@User() user: UserType) {
        return this.authService.checkUser(user)
    }

}
