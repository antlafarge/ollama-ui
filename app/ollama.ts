import { AI_ENDPOINT, AI_MODEL } from "./constants";

export type TagsResponse = {
    models: Array<{
        name: string;
        model: string;
        modified_at: string;
        size: number;
        digest: string;
        details: {
            format: string;
            family: string;
            families: string[];
            paremeter_size: string;
            quantization_level: string;
        }
    }>
}

export async function tags(): Promise<TagsResponse> {
    const response = await fetch(`${AI_ENDPOINT}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
        throw new Error(await response.text())
    }

    if (!response.body) {
        throw new Error('Missing body');
    }

    return await response.json();
}

export type PullResponse = {
    status: string;
}

export async function pull(model: string): Promise<PullResponse> {
    const response = await fetch(`${AI_ENDPOINT}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            stream: false,
        })
    });

    if (!response.ok) {
        throw new Error(await response.text())
    }

    return await response.json();
}

export type LogProb = {
    token: string;
    logprob: number;
    bytes: number[];
}

export type GenerateResponse = {
    model: string;
    created_at: string;
    response: string;
    thinking: string;
    done: boolean;
    done_reason: string;
    total_duration: number;
    load_duration: number;
    prompt_eval_count: number;
    prompt_eval_duration: number;
    eval_count: number;
    eval_duration: number;
    logprobs: Array<
        & LogProb
        & {
            top_logprobs: Array<LogProb>;
        }>;
};

export async function* generate(prompt: string): AsyncGenerator<GenerateResponse> {
    if (!prompt.length) {
        throw new Error('PROMPT_EMPY');
    }

    const response = await fetch(`${AI_ENDPOINT}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: AI_MODEL,
            system: '',
            prompt,
        })
    });

    if (!response.ok) {
        throw new Error(await response.text())
    }

    const textDecoder = new TextDecoder();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const chunk of response.body as any) {
        const json = textDecoder.decode(chunk as Uint8Array<ArrayBuffer>);
        yield JSON.parse(json) as GenerateResponse;
    }
}
