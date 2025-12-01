
import { Tag } from '../../types';
import { SubPanel, FrameData, CaptionOption } from '../../services/gemini';
import { ProviderType } from '../../services/llm';
import { SocialPlatformStrategy } from '../../services/strategies';

export type WorkflowStep = 'input' | 'base_generated' | 'avatar_mode' | 'final_generated' | 'refine_mode' | 'cover_mode';

export interface SharedGalleryProps {
  apiKey: string;
  baseUrl: string;
  provider: ProviderType;
  useThinking: boolean;
  targetPlatform: SocialPlatformStrategy | null;
}
