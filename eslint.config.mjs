import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '.tools/**', '.agents/**', '.claude/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['**/*.cjs'], languageOptions: { globals: { module: 'readonly' } } },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': ['error', {
        'ts-ignore': true,
        'ts-nocheck': true,
        'ts-expect-error': 'allow-with-description',
        minimumDescriptionLength: 10,
      }],
      'no-console': 'error',
    },
  },
  {
    files: ['packages/domain/**/*.ts', 'packages/application/**/*.ts'],
    rules: {
      'no-restricted-properties': ['error',
        { object: 'Date', property: 'now', message: 'Obtén el tiempo del puerto Reloj.' },
        { object: 'Math', property: 'random', message: 'Obtén los IDs del puerto GeneradorId.' },
        { object: 'crypto', property: 'randomUUID', message: 'Obtén los IDs del puerto GeneradorId.' },
        { object: 'performance', property: 'now', message: 'Obtén el tiempo del puerto Reloj.' },
      ],
      'no-restricted-syntax': ['error',
        { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: 'Obtén el tiempo del puerto Reloj.' },
        { selector: "MemberExpression[object.object.name='globalThis'][object.property.name='crypto'][property.name='randomUUID']", message: 'Obtén los IDs del puerto GeneradorId.' },
      ],
    },
  },
);
