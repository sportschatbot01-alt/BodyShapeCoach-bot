import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';

type Env = {
    TELEGRAM_BOT_TOKEN: string;
    MY_WORKFLOW: Workflow;
};

// Optional payload parameters for triggering the workflow
type Params = {
    message: string;
    chatId: string;
};

export class TelegramBotWorkflow extends WorkflowEntrypoint<Env, Params> {
    async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
        const { message, chatId } = event.payload;

        // Step 1: Prepare the response
        const responseText = await step.do('prepare-response', async () => {
            // Simple fallback logic based on input
            let text = '';
            if (message.toLowerCase() === '/start') {
                text = `Welcome! I am your Body Shape Coach bot. Let's start your fitness journey! 💪`;
            } else {
                text = `You said: "${message}". I will get back to you with advice soon!`;
            }
            return { text };
        });

        // Step 2: Send message via Telegram API
        await step.do(
            'send-telegram-message',
            {
                retries: { limit: 3, delay: '3s', backoff: 'exponential' },
                timeout: '2 minutes',
            },
            async () => {
                await fetch(
                    `https://api.telegram.org/bot${this.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chat_id: chatId, text: responseText.text }),
                    },
                );
            },
        );
    }
}

// HTTP endpoint to trigger Workflow
export default {
    async fetch(req: Request, env: Env): Promise<Response> {
        if (req.method === 'POST') {
            const body = await req.json();
            const instance = await env.MY_WORKFLOW.create({ payload: body });
            return Response.json({ id: instance.id, status: await instance.status() });
        }
        return Response.json({ message: 'Workflow running' });
    },
};
