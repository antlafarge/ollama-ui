import { AI_ENDPOINT } from "./constants";

export async function* parseNDJSON<T>(generator: AsyncGenerator<Uint8Array<ArrayBuffer>>, onError?: (error: unknown) => void): AsyncGenerator<T> {
    const textDecoder = new TextDecoder();
    let json = '';

    for await (const chunk of generator) {
        json += textDecoder.decode(chunk);
        let index = -1;

        while ((index = json.indexOf('\n')) > -1) {
            const jsonPart = json.substring(0, index).trim();
            json = json.substring(index + 1);

            if (jsonPart.length) {
                try {
                    yield JSON.parse(jsonPart);
                } catch (error) {
                    onError?.(error);
                }
            }
        }
    }

    json = json.trim();

    if (json.length) {
        try {
            yield JSON.parse(json);
        } catch (error) {
            onError?.(error);
        }
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
    digest?: `sha256:${string}`;
    total?: number;
    completed?: number;
}

export async function pull(model: string): Promise<AsyncGenerator<PullResponse>> {
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
    return parseNDJSON<PullResponse>(response.body as any, console.error);
}

export type LogProb = {
    token?: string;
    logprob?: number;
    bytes?: number[];
};

export type GenerateRequest = {
    model: string;
    prompt?: string;
    suffix?: string;
    images?: string[];
    format?: "json" | object;
    system?: string;
    stream?: boolean;
    think?: boolean;
    raw?: boolean;
    keep_alive?: string | number;
    options?: {
        seed?: number;
        temperature?: number;
        top_k?: number;
        top_p?: number;
        min_p?: number;
        stop?: string | string[];
        num_ctx?: number;
        num_predict?: number;
    };
    logprobs?: boolean;
    top_logprobs?: number;
};

export type GenerateResponse = {
    model: string;
    created_at?: string;
    response?: string;
    done?: boolean;
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
        & { top_logprobs: LogProb[]; }
    >;
};

export async function generate(generateRequest: GenerateRequest): Promise<AsyncGenerator<GenerateResponse>> {
    if (!generateRequest.prompt?.length) {
        throw new Error('PROMPT_EMPY');
    }

    const response = await fetch(`${AI_ENDPOINT}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generateRequest),
    });

    if (!response.ok) {
        throw new Error(await response.text())
    }

    if (!response.body) {
        throw new Error('Missing body');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return parseNDJSON<GenerateResponse>(response.body as any, console.error);
}

export type ToolCalls = {
    function?: {
        name: string;
        description?: string;
        arguments?: object;
    }
}

export type ChatRequest = {
    model: string;
    messages: Array<{
        role: "system" | "user" | "assistant" | "tool";
        content: string;
        images?: string[];
        tool_calls?: ToolCalls[];
    }>;
    tools?: {
        type: "function";
        function: {
            name: string;
            paremeters: object;
            description?: string;
        };
    };
    format?: "json" | object;
    options?: {
        seed?: number;
        temperature?: number;
        top_k?: number;
        top_p?: number;
        min_p?: number;
        stop?: string | string[];
        num_ctx?: number;
        num_predict?: number;
    };
    stream?: boolean;
    think?: boolean | "high" | "medium" | "low";
    keep_alive?: string | number;
    logprobs?: boolean;
    top_logprobs?: number;
}

export type ChatResponse = {
    model?: string;
    created_at?: string;
    message?: {
        role?: 'assistant';
        content?: string;
        thinking?: string;
        tool_calls?: ToolCalls[];
        images?: string[];
    };
    done?: boolean;
    done_reason?: string;
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    prompt_eval_duration?: number;
    eval_count?: number;
    eval_duration?: number;
    logprobs?: Array<
        & LogProb
        & { top_logprobs: LogProb[]; }
    >;
};

export async function chat(chatRequest: ChatRequest): Promise<AsyncGenerator<ChatResponse>> {
    if (!chatRequest.messages?.length) {
        throw new Error('PROMPT_EMPY');
    }

    if (!chatRequest.messages[0].role?.length || !chatRequest.messages[0].content?.length) {
        throw new Error('PROMPT_EMPY');
    }

    const response = await fetch(`${AI_ENDPOINT}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatRequest),
    });

    if (!response.ok) {
        throw new Error(await response.text())
    }

    if (!response.body) {
        throw new Error('Missing body');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return parseNDJSON<ChatResponse>(response.body as any, console.error);
}

export async function deleteModel(model: string): Promise<void> {
    const response = await fetch(`${AI_ENDPOINT}/api/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
    });

    if (!response.ok) {
        throw new Error(await response.text())
    }
}
