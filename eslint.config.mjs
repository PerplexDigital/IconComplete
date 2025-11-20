import { createConfigForNuxt } from '@nuxt/eslint-config'

export default createConfigForNuxt({
	// options here
}).override('nuxt/javascript', {
	rules: {
		'no-unused-vars': ['error', { 
			argsIgnorePattern: '^_',
			varsIgnorePattern: '^_'
		}]
	},
	ignores: ['out/**', 'dist/**', '*.js']
})
