const resetPassword = (firstName) => {
    return `
        <!DOCTYPE html>
        <html lang="en">

        <head>
            <meta charset="UTF-8">
            <title>Home Page</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>

        <body>
            <p>
                <em>This is an automated message from the Scrap team</em>
            </p>
            <h3>
                ${firstName}... Forgot your password?<br>
            </h3>
            <p>
                No worries, it happens!<br>
                Go ahead and click the link below to reset your password.<br>
                This link expires in 10 minutes and can only be used once.<br>
            </p>
            <h3>
                <a href="http://localhost:4000/">Reset Password</a>
            </h3>
            <p>
                If you did not request a password reset, you can safely ignore this message.<br>
            </p>
        </body>

        </html>
        `
}

module.exports = {
    resetPassword,
}