
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text', text: string } | { type: 'image_url', image_url: { url: string } }>;
}

export interface LLMConfig {
  responseMimeType?: string;
  thinking?: {
    enabled: boolean;
    level?: 'HIGH' | 'LOW';
    includeThoughts?: boolean;
  };
}

export interface LLMResponse {
  text: string;
  images?: string[]; // Base64 strings
}

export interface LLMProvider {
  generateContent(model: string, messages: LLMMessage[], config?: LLMConfig): Promise<LLMResponse>;
}

export type ProviderType = 'google' | 'openai';

export class GoogleProvider implements LLMProvider {
  constructor(private apiKey: string, private baseUrl: string) {}

  private getEndpoint(): string {
    let endpoint = this.baseUrl.trim() || "https://generativelanguage.googleapis.com/v1beta";
    if (endpoint.includes('/openai')) {
        endpoint = "https://generativelanguage.googleapis.com/v1beta"; 
    }
    if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
    return endpoint;
  }

  async generateContent(model: string, messages: LLMMessage[], config: LLMConfig = {}): Promise<LLMResponse> {
    const url = `${this.getEndpoint()}/models/${model}:generateContent?key=${this.apiKey}`;
    
    // Convert generic messages to Gemini contents
    let systemInstruction: any = undefined;
    const contents: any[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction = { parts: [{ text: msg.content as string }] };
      } else {
        const parts: any[] = [];
        if (Array.isArray(msg.content)) {
          for (const part of msg.content) {
            if (part.type === 'text') {
              parts.push({ text: part.text });
            } else if (part.type === 'image_url') {
              const base64Data = await this.resolveImage(part.image_url.url);
              if (base64Data) {
                parts.push({
                  inline_data: { mime_type: 'image/jpeg', data: base64Data }
                });
              }
            }
          }
        } else {
          parts.push({ text: msg.content });
        }
        contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts });
      }
    }

    const body: any = { contents, generationConfig: {} };
    if (systemInstruction) body.systemInstruction = systemInstruction;
    if (config.responseMimeType) body.generationConfig.responseMimeType = config.responseMimeType;
    
    // Gemini Thinking Config (Not supported on image models)
    if (config.thinking?.enabled && !model.includes('image')) {
       body.generationConfig.thinkingConfig = {
         thinkingLevel: config.thinking.level || 'HIGH',
         includeThoughts: config.thinking.includeThoughts ?? true
       };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Google API Error: ${response.status} - ${err.error?.message || response.statusText}`);
    }

    const json = await response.json();
    return this.parseGeminiResponse(json);
  }

  private async resolveImage(url: string): Promise<string> {
    if (url.startsWith('data:')) return url.split(',')[1];
    if (url.startsWith('http')) {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.warn("Failed to fetch image:", e);
        return "";
      }
    }
    return "";
  }

  private async parseGeminiResponse(json: any): Promise<LLMResponse> {
    const parts = json.candidates?.[0]?.content?.parts || [];
    let text = '';
    const images: string[] = [];

    for (const part of parts) {
      if (part.text) text += part.text;
      if (part.inlineData) {
        images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
      }
    }

    // Fallback: Check for Markdown images in text if no inlineData
    if (images.length === 0 && text) {
        const urlMatch = text.match(/https?:\/\/[^\s)]+/);
        if (urlMatch) {
             const base64 = await this.resolveImage(urlMatch[0]);
             if (base64) images.push(`data:image/jpeg;base64,${base64}`);
        }
    }

    return { text, images };
  }
}

export class OpenAIProvider implements LLMProvider {
  constructor(private apiKey: string, private baseUrl: string) {}

  private getEndpoint(): string {
    let endpoint = this.baseUrl.trim() || "https://api.openai.com/v1";
    if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
    return endpoint;
  }

  async generateContent(model: string, messages: LLMMessage[], config: LLMConfig = {}): Promise<LLMResponse> {
    // Distinguish between Image Generation (DALL-E) and Chat Completion (GPT)
    // Note: This is a heuristic.
    if (model.toLowerCase().includes('dall-e')) {
        return this.generateImage(model, messages);
    } else {
        return this.generateText(model, messages, config);
    }
  }

  private async generateText(model: string, messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
     const url = `${this.getEndpoint()}/chat/completions`;
     
     const body: any = {
         model: model,
         messages: messages,
         stream: false
     };

     if (config.responseMimeType === 'application/json') {
         body.response_format = { type: "json_object" };
     }

     // OpenAI "Thinking" mapping (e.g. for o1 models, though param is reasoning_effort)
     // Standard GPT-4o doesn't support 'thinkingConfig'. We ignore it or prompt inject.
     if (config.thinking?.enabled && (model.startsWith('o1') || model.startsWith('o3'))) {
         body.reasoning_effort = config.thinking.level === 'LOW' ? 'low' : 'high';
     }

     const response = await fetch(url, {
         method: 'POST',
         headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${this.apiKey}`
         },
         body: JSON.stringify(body)
     });

     if (!response.ok) {
         const err = await response.json().catch(() => ({}));
         throw new Error(`OpenAI API Error: ${response.status} - ${err.error?.message || response.statusText}`);
     }

     const json = await response.json();
     return { text: json.choices[0]?.message?.content || '' };
  }

  private async generateImage(model: string, messages: LLMMessage[]): Promise<LLMResponse> {
      // DALL-E 3 does not support img2img (input images). It only supports text prompt.
      // We must extract the LAST user text prompt.
      const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
      let prompt = "Generate an image.";
      
      if (lastUserMessage) {
          if (typeof lastUserMessage.content === 'string') {
              prompt = lastUserMessage.content;
          } else if (Array.isArray(lastUserMessage.content)) {
              const textPart = lastUserMessage.content.find(p => p.type === 'text');
              if (textPart && 'text' in textPart) {
                  prompt = textPart.text;
              }
          }
      }

      // Truncate prompt if necessary (DALL-E limit is roughly 4000 chars)
      prompt = prompt.substring(0, 4000);

      const url = `${this.getEndpoint()}/images/generations`;
      const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
              model: model,
              prompt: prompt,
              n: 1,
              size: "1024x1024",
              response_format: "b64_json"
          })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`OpenAI Image Error: ${response.status} - ${err.error?.message || response.statusText}`);
      }

      const json = await response.json();
      const b64 = json.data?.[0]?.b64_json;
      
      if (!b64) throw new Error("No image data returned from OpenAI");

      return {
          text: "Image generated via DALL-E 3",
          images: [`data:image/png;base64,${b64}`]
      };
  }
}

export function createLLMProvider(type: ProviderType, apiKey: string, baseUrl: string): LLMProvider {
  if (type === 'openai') {
    return new OpenAIProvider(apiKey, baseUrl);
  }
  return new GoogleProvider(apiKey, baseUrl);
}
