import { BadRequestException, GoneException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { EmailSenderService } from 'src/email-sender/email-sender.service';
import { UserType } from 'src/lib/decorator/User.decorator';
import { v4 as uuidv4 } from 'uuid';
import { ForgotPasswordDto, LoginDto, RegistrationAdminDto, RegistrationUserDto, ResetPasswordDto } from './dto/auth.dto';
import { Cache } from 'cache-manager';

@Injectable()
export class AuthService {
    constructor(
        @Inject('POSTGRES_POOL') private readonly sql: any,
        @Inject('CACHE_MANAGER') private readonly cacheManager: Cache,
        private readonly jwtService: JwtService,
        private readonly emailSender: EmailSenderService
    ) {}

    async checkUser(user: UserType) {
        // might want to get into the database later and cache if more data is needed
        const userId = user.id;

        const userCache = await this.cacheManager.get(`${userId}`); 
        // TODO: update he cached in the settings when changing information

        if(userCache) {
            return userCache
        }

        const getUser = await this.sql`
            SELECT id, name, email, username, branch, role, student_id, year_level, course, profile
            FROM users
            WHERE id = ${userId}
        `

        if(!getUser.length) {
            throw new NotFoundException('User not found')
        }

        await this.cacheManager.set(`${userId}`, getUser[0])

        return getUser[0];
    }

    async validateUser(body: LoginDto) {
        const getUser = await this.sql`
            SELECT * FROM users 
            WHERE username = ${body.username}
        `

        if(getUser.length === 0) {
            return {
                user: null,
                name: 'username',
                message: 'username not found!'
            }
        }

        const verifyPassword = await bcrypt.compare(body.password, getUser[0].password)

        if(!verifyPassword) {
            return {
                user: null,
                name: 'password',
                message: 'wrong password!'
            }
        }

        return {
            user: getUser[0],
            name: '',
            message: 'Successfully Log In'
        }
    }

    async login(user: any) {
        const payload = {
            id: user.id,
            username: user.name,
            branch: user.branch,
            email: user.email,
            role: user.role
        }

        const access_token = this.jwtService.sign(payload, { expiresIn: '5m', secret: process.env.JWT_SECRET })
        const refresh_token = await this.generateRefreshToken(user.id)

        return {
            access_token: access_token,
            refresh_token: refresh_token
        }
    }

    async ValidateRegistration(body: RegistrationAdminDto | RegistrationUserDto | any, type: 'admin' | 'user') {
        // check if email is valid for user and admin conditionally
        const EMAIL_VALIDATION = {
            USER: /^[a-zA-Z].+[0-9]+@[a-zA-Z]+\.sti\.edu\.ph$/,
            ADMIN: /^[a-zA-Z].+[a-zA-Z]+@[a-zA-Z]+\.sti\.edu\.ph$/
        }

        const Regex = type === 'user' ? EMAIL_VALIDATION.USER : EMAIL_VALIDATION.ADMIN;
        if(!body.email.match(Regex)) {
            throw new BadRequestException({name: "email", message: 'Invalid email format'});
        }

        const checkIfExist = await this.sql`
            SELECT username, email, student_id FROM users 
            WHERE username = ${body.username} 
            OR email = ${body.email} 
            -- if we are only checking for admin then we don't need this so just let it be because it's just an 
            -- OR clause
            OR (CASE WHEN ${type} = 'user' THEN student_id = ${body.student_id} ELSE FALSE END)
        `

        for (const record of checkIfExist) {
            if(record?.username === body.username) {
                throw new BadRequestException({ name: 'username', message: 'Username already exists' });
            }

            if(record?.email === body.email) {
                throw new BadRequestException({name: 'email', message: 'Email already exists'});
            }

            if(body instanceof RegistrationUserDto && record?.student_id === body.student_id) {
                throw new BadRequestException({ name: 'student_id', message: 'Student ID already exists'});
            }
        }

        return true
    }

    async RegistrationUser(body: RegistrationUserDto) {
        const isValid = await this.ValidateRegistration(body, 'user');

        if(!isValid) {
            throw new GoneException("there is an invalid input (can't identify)")
        }

        const name = body.firstName + ' ' + body.lastName;
        const hashedPassword = await bcrypt.hash(body.password, 10);
        const branch = body.email.split('@')[1].split('.')[0]

        const sendEmail = await this.createEmail(body.email);
        const result = await this.sql`
            INSERT INTO userplaceholder (username, name, email, password, branch, education_level, student_id, year_level, course) 
            VALUES (${body.username}, ${name}, ${body.email}, ${hashedPassword}, ${branch}, 
            ${body.education_level}, ${body.student_id}, ${body.year_level}, ${body.course})
            RETURNING *;
        `

        if(!result.length) {
            throw new InternalServerErrorException('failed to create user try again')
        }

        return {
            success: true,
            message: 'successfully created account',
            next_action: 'redirect',
            redirect_url: `${process.env.CLIENT_BASE_URL}/verifyEmail?email=${result[0].email}`
        }
    }

    async RegistrationAdmin(body: RegistrationAdminDto) {
        const isValid = await this.ValidateRegistration(body, 'admin');

        if(!isValid) {
            throw new GoneException("there is an invalid input (can't identify)")
        }

        const name = body.firstName + ' ' + body.lastName;
        const hashedPassword = await bcrypt.hash(body.password, 10);
        const branch = body.email.split('@')[1].split('.')[0]

        const sendEmail = await this.createEmail(body.email);
        const result = await this.sql`
            INSERT INTO userplaceholder (username, name, email, password, branch, role)
            VALUES (${body.username}, ${name}, ${body.email}, ${hashedPassword}, ${branch}, 'admin')
            RETURNING *;
        `

        if(!result.length) {
            throw new InternalServerErrorException("failed to create user try again")
        }

        return {
            success: true,
            message: 'successfully created account',
            next_action: 'redirect',
            redirect_url: `${process.env.CLIENT_BASE_URL}/verifyEmail?email=${result[0].email}`
        }
    }

    async createEmail(email: string) {
        const code = Math.floor(100000 + Math.random() * 900000); // generate 6 digit code

        const existingEmail = await this.sql`
            SELECT * FROM emailVerify WHERE email = ${email};
        `;

        if(existingEmail.length > 0) {
            throw new BadRequestException('Email verification already sent')
        }

        const result = await this.sql`
            INSERT INTO emailVerify (email, code) 
            VALUES (${email}, ${code})
            RETURNING *;
        `
        // send email to user with code
        await this.emailSender.sendOtpEmail(email, code)

        return result[0]
    }

    async verifyEmail(token: string, email: string) {
        const getVerification = await this.sql`
            SELECT * FROM emailVerify WHERE email = ${email}
        `

        // Check if a record was found
        if (!getVerification.length) {
            throw new BadRequestException('No verification record found for this email!');
        }

        if(getVerification[0].code !== token) {
            throw new BadRequestException('Invalid Code!')
        }
        
        // create the user if the code is correct
        const getUser = await this.sql`
            SELECT * FROM userplaceholder WHERE email = ${email}
        `

        if(!getUser.length) {
            throw new InternalServerErrorException('user is not defined!')
        }

        const user = getUser[0]

        const createUser = await this.sql`
            INSERT INTO users (username, name, email, password, branch, role, education_level, student_id, year_level, course)
            VALUES (${user.username}, ${user.name}, ${user.email}, ${user.password}, ${user.branch}, ${user.role},
            ${user.education_level}, ${user.student_id}, ${user.year_level}, ${user.course});
        `

        // delete placeholder and verifyUser
        const deleteVerifyEmail = await this.sql`
            DELETE FROM emailVerify 
            WHERE email = ${email};
        `
        const deleteUserPlaceholder = await this.sql`
            DELETE FROM userplaceholder
            WHERE id = ${user.id}
        `

        return {
            success: true,
            message: 'successfully verify email',
            next_action: 'redirect',
            redirect_url: `${process.env.CLIENT_BASE_URL}/login`
        }
    }

    async resendEmail(email: string) {
        const getVerificationEmail = await this.sql`
            SELECT * FROM emailVerify WHERE email = ${email}
        `

        if(getVerificationEmail.length === 0) {
            throw new NotFoundException('email not found on verifications')
        }

        const code = Math.floor(100000 + Math.random() * 900000); // generate 6 digit code
        const updateVerification = await this.sql`
            UPDATE emailverify 
            SET code = ${code}
            WHERE id = ${getVerificationEmail[0].id}
        ` 

        // send email
        await this.emailSender.sendOtpEmail(email, code)

        return "email has been resent"
    }

    async generateRefreshToken(userId: string) {
        if(!userId) {
            throw new GoneException('userId is undefined!')
        }

        const deleteRefreshToken = await this.sql`
            DELETE FROM refreshtokens 
            WHERE userid = ${userId}
        `

        const refreshToken = uuidv4()
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 28) // 4weeks 

        const saveRefreshtoken = await this.sql`
            INSERT INTO refreshtokens (userid, token, expiresAt)
            VALUES (${userId}, ${refreshToken}, ${expiresAt})
            RETURNING token;
        `

        if(!saveRefreshtoken.length) {
            throw new InternalServerErrorException('failed to create refresh token')
        }

        return saveRefreshtoken[0].token
    }

    // the one verifying for refresh token
    async refreshToken(refreshToken: string) {
        if(!refreshToken) {
            throw new GoneException({
                name: 'refreshToken',
                message: 'refresh toked does not exist'
            })
        }

        const getRefreshToken = await this.sql`
            SELECT * FROM refreshtokens
            WHERE token = ${refreshToken} 
            AND expiresat > ${new Date()}
        `

        // Handle case where no token is found
        if (!getRefreshToken.length) {
            throw new GoneException('Invalid or expired refresh token');
        }

        const user = await this.sql`
            SELECT * FROM users
            WHERE id = ${getRefreshToken[0].userid}
        `

        if(!user.length) {
            throw new InternalServerErrorException('failed to find user!')
        }

        return this.login(user[0])
    }

    async forgotPassword(body: ForgotPasswordDto) {
        const checkEmail = await this.sql`
            SELECT email FROM users
            WHERE email = ${body.email}
        `;

        if(!checkEmail.length) {
            throw new BadRequestException('user does not exist with this email')
        }

        const code = Math.floor(100000 + Math.random() * 900000); // generate 6 digit code

        // deleting all the existing password codes just in case
        await this.sql`
            DELETE FROM passwordcode
            WHERE email = ${body.email}
        `

        const createResetCode = await this.sql`
            INSERT INTO passwordcode (email, code)
            VALUES (${body.email}, ${code})
            RETURNING code;
        `

        if(!createResetCode.length) {
            throw new InternalServerErrorException('failed to create reset code')
        }
        
        // send email
        await this.emailSender.sendResetPasswordLink(body.email, code)

        return {
            message: "Please check your email for the reset link."
        }
    }

    async resetPassword(body: ResetPasswordDto) {
        const getCode = await this.sql`
            SELECT * FROM passwordcode
            WHERE email = ${body.email}
        `

        if(!getCode.length) {
            throw new BadRequestException('No reset code found')
        }

        if(getCode[0].code !== body.token) {
            throw new BadRequestException('Invalid reset code')
        }

        const hashedPassword = await bcrypt.hash(body.newPassword, 10);

        const updatePassword = await this.sql`
            UPDATE users
            SET password = ${hashedPassword}
            WHERE email = ${body.email}
            RETURNING email;
        `

        if(!updatePassword.length) {
            throw new InternalServerErrorException('failed to update password')
        }

        // delete the reset code
        const deleteCode = await this.sql`
            DELETE FROM passwordcode
            WHERE email = ${body.email}
        `
    
        return {
            'message': 'Password has been updated'
        }
    }
}
