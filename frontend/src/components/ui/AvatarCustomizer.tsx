import React from 'react';
import type { AvatarCustomization } from '../../types';

// ---------------------------------------------------------------------------
// Avatar customiser (Phase 1). Every choice maps to the AvatarCustomization
// stored on the child profile and rendered by the 3D avatar builder
// (game/avatar.ts): skin tone, hair style/colour, outfit style, outfit
// colour, and one accessory.
// ---------------------------------------------------------------------------

interface Option {
  value: string;
  label: string;
  swatch?: string; // CSS colour for colour options
}

const SKIN_TONES: Option[] = [
  { value: 'light', label: 'Light', swatch: '#ffd9c4' },
  { value: 'medium', label: 'Medium', swatch: '#deb887' },
  { value: 'tan', label: 'Tan', swatch: '#c2916b' },
  { value: 'dark', label: 'Dark', swatch: '#8c6142' },
];

const HAIR_STYLES: Option[] = [
  { value: 'short', label: 'Short' },
  { value: 'spiky', label: 'Spiky' },
  { value: 'long', label: 'Long' },
  { value: 'curly', label: 'Curly' },
  { value: 'bald', label: 'Bald' },
];

const HAIR_COLORS: Option[] = [
  { value: 'black', label: 'Black', swatch: '#1a1a1a' },
  { value: 'brown', label: 'Brown', swatch: '#664222' },
  { value: 'blonde', label: 'Blonde', swatch: '#e6cc80' },
  { value: 'red', label: 'Red', swatch: '#b3331a' },
  { value: 'blue', label: 'Blue', swatch: '#3366e6' },
  { value: 'purple', label: 'Purple', swatch: '#995ce6' },
  { value: 'pink', label: 'Pink', swatch: '#f273bf' },
];

const OUTFITS: Option[] = [
  { value: 'casual_blue', label: 'Casual' },
  { value: 'casual_red', label: 'Sporty' },
  { value: 'superhero_cape', label: 'Superhero' },
];

const OUTFIT_COLORS: Option[] = [
  { value: 'blue', label: 'Blue', swatch: '#0099ff' },
  { value: 'red', label: 'Red', swatch: '#e63333' },
  { value: 'green', label: 'Green', swatch: '#33bf4d' },
  { value: 'purple', label: 'Purple', swatch: '#995ce6' },
  { value: 'orange', label: 'Orange', swatch: '#f28c1a' },
  { value: 'pink', label: 'Pink', swatch: '#f273bf' },
  { value: 'yellow', label: 'Yellow', swatch: '#f2cc26' },
  { value: 'teal', label: 'Teal', swatch: '#1abfb3' },
];

const ACCESSORIES: Option[] = [
  { value: '', label: 'None' },
  { value: 'glasses', label: '😎 Glasses' },
  { value: 'cape', label: '🦸 Cape' },
  { value: 'star_pin', label: '⭐ Star Pin' },
];

interface AvatarCustomizerProps {
  value: AvatarCustomization;
  onChange: (avatar: AvatarCustomization) => void;
}

export const DEFAULT_AVATAR: AvatarCustomization = {
  skin_tone: 'medium',
  hair_style: 'short',
  hair_color: 'brown',
  outfit: 'casual_blue',
  outfit_color: 'blue',
  accessory: '',
};

export const AvatarCustomizer: React.FC<AvatarCustomizerProps> = ({ value, onChange }) => {
  const set = (patch: Partial<AvatarCustomization>) => onChange({ ...value, ...patch });

  const renderGroup = (
    label: string,
    options: Option[],
    current: string | undefined,
    apply: (v: string) => void
  ) => (
    <div className="mb-5">
      <label className="block text-gray-700 font-bold mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = (current || '') === opt.value;
          return (
            <button
              key={opt.value || 'none'}
              type="button"
              onClick={() => apply(opt.value)}
              className={`px-3 py-2 rounded-xl border-3 font-semibold text-sm transition-all flex items-center gap-2 ${
                selected
                  ? 'border-roblox-blue bg-blue-50 scale-105 shadow'
                  : 'border-gray-300 hover:border-roblox-blue bg-white'
              }`}
              style={{ borderWidth: 3 }}
            >
              {opt.swatch && (
                <span
                  className="inline-block w-4 h-4 rounded-full border border-gray-400"
                  style={{ backgroundColor: opt.swatch }}
                />
              )}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div>
      {renderGroup('🧑 Skin Tone', SKIN_TONES, value.skin_tone, (v) => set({ skin_tone: v }))}
      {renderGroup('💇 Hair Style', HAIR_STYLES, value.hair_style, (v) => set({ hair_style: v }))}
      {renderGroup('🎨 Hair Colour', HAIR_COLORS, value.hair_color, (v) => set({ hair_color: v }))}
      {renderGroup('👕 Outfit', OUTFITS, value.outfit, (v) => set({ outfit: v }))}
      {renderGroup('🌈 Outfit Colour', OUTFIT_COLORS, value.outfit_color, (v) => set({ outfit_color: v }))}
      {renderGroup('✨ Accessory', ACCESSORIES, value.accessory, (v) => set({ accessory: v }))}
    </div>
  );
};
