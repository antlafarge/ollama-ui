import { AI_ENDPOINT } from "./constants";

export async function* processXNdJson<T>(generator: AsyncGenerator<Uint8Array<ArrayBuffer>>): AsyncGenerator<T> {
    const textDecoder = new TextDecoder();

    let json = '';

    for await (const chunk of generator) {
        json += textDecoder.decode(chunk);

        console.log(json);

        const index = json.indexOf('\n');

        if (index > -1) {
            yield JSON.parse(json.substring(0, index));

            json = json.substring(index);
        }
    }

    if (json.length) {
        yield JSON.parse(json);
    }
}

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
    status: `pulling ${string}` | 'verifying sha256 digest' | 'writing manifest' | 'success';
    digest: `sha256:${string}`;
    total: number;
    completed: number;
}

export async function* pull(model: string): AsyncGenerator<PullResponse> {
    const response = await fetch(`${AI_ENDPOINT}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
        })
    });

    if (!response.ok) {
        throw new Error(await response.text())
    }

    if (!response.body) {
        throw new Error('Missing body');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return processXNdJson<PullResponse>(response.body as any);
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
    done: boolean;
    thinking?: string;
    done_reason?: string;
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    prompt_eval_duration?: number;
    eval_count?: number;
    eval_duration?: number;
    logprobs?: Array<
        & LogProb
        & {
            top_logprobs: Array<LogProb>;
        }>;
};

export async function* generate({ prompt, model }: { prompt: string; model: string; }): AsyncGenerator<GenerateResponse> {
    if (!prompt.length) {
        throw new Error('PROMPT_EMPY');
    }

    const response = await fetch(`${AI_ENDPOINT}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: model,
            system: '',
            prompt,
        })
    });

    if (!response.ok) {
        throw new Error(await response.text())
    }

    if (!response.body) {
        throw new Error('Missing body');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return processXNdJson<GenerateResponse>(response.body as any);
}
