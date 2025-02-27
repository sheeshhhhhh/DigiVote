import { GoneException, Injectable, InternalServerErrorException } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class EmailSenderService {
    constructor() {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY) 
    }

    async sendTextEmail(name: string, email: string, message: string) {
        const msg = {
            to: 'renatodsantosjr9@gmail.com',
            from: 'renatodsantosjr9@gmail.com',
            subject: 'Get In Touch (STI Voting System)',
            text: `
                Name: ${name},
                Email: ${email}

                message: ${message}
            `,
        } satisfies sgMail.MailDataRequired

        try {
            const response = await sgMail.send(msg)
            return response
        } catch (error) {
            throw new GoneException('failed to send message try again later!')   
        }
    }

    async sendEmail(to: string, subject: string, title: string, content: string, options?: Partial<sgMail.MailDataRequired>) {
        const msg = {
            to: to,
            from: 'renatodsantosjr9@gmail.com',
            subject: subject,
            html: content,
        }

        try {
            const response = await sgMail.send(msg)
            return response
        } catch(error: any) {
            console.log(`Error sending email: ${error.message}`)
        }
    }

    async sendOtpEmail(to: string, code: number) {
       try {
        const content = `
        <div style="font-family: Helvetica,Arial,sans-serif;width:600px;overflow:auto;line-height:2">
            <div style="margin:50px auto;width:70%;padding:20px 0">
                <div style="border-bottom:1px solid #eee">
                    <a href="${process.env.CLIENT_BASE_URL}" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">STI-voting</a>
                </div>
                <p style="font-size:1.1em">Hi,</p>
                <p>Thank you for choosing STI-voting. Use the following OTP to verify your account and complete the sign-up process.</p>
                <h2 style="background: #00466a;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;">
                    ${code}
                </h2>
                <p style="font-size:0.9em;">Regards,<br />STI-voting Team</p>
                <hr style="border:none;border-top:1px solid #eee" />
                <div style="float:center;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
                    <p>STI-voting Inc</p>
                    <p>Poblacion Sta Maria, Bulacan</p>
                    <p>Philippines</p>
                </div>
            </div>
        </div>
        `

        await this.sendEmail(to, 'OTP', 'Verify Email', content)
       } catch (error) {
        console.log('error sending otp: ', error)
       }
    }

    async sendResetPasswordLink(to: string, token: number) {
        try {
            const baseUrl = process.env.CLIENT_BASE_URL
            const magicLink = `${baseUrl}/resetPassword?token=${token}&email=${to}`

            const content = `
            <div style="font-family: Helvetica,Arial,sans-serif;width:600px;overflow:auto;line-height:2">
                <div style="margin:50px auto;width:70%;padding:20px 0">
                    <div style="border-bottom:1px solid #eee">
                        <a href="${baseUrl}" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">STI-voting</a>
                    </div>
                    <p style="font-size:1.1em">Hi,</p>
                    <p>You are resetting your password. if this is you please click the link to reset your password</p>
                    <a href="${magicLink}" 
                    style="background: #00466a;margin: 0 auto;width: max-content;padding: 10px 20px;color: #fff;border-radius: 4px;">
                        resetPassword
                    </a>
                    <p style="font-size:0.9em;">Regards,<br />STI-voting Team</p>
                    <hr style="border:none;border-top:1px solid #eee" />
                    <div style="float:center;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
                        <p>STI-voting Inc</p>
                        <p>Poblacion Sta Maria, Bulacan</p>
                        <p>Philippines</p>
                    </div>
                </div>
            </div>
            `
            
            await this.sendEmail(to, 'Reset Password', 'Reset Password', content)
        } catch (error) {
            console.log('error sending reset password link: ', error)
            throw new InternalServerErrorException('Error sending reset password link')
        }
    }
}
