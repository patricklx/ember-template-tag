import { describe, expect, it } from 'vitest';
import { transform } from '../lib/index';

describe('template tag', () => {
    it('should work', () => {
        const result = transform({
            input: '<template></template>',
            relativePath: ''
        });
        expect(result.output).toEqual(`import { template } from "@ember/template-compiler";
export default template(\`\`, {
  moduleName: "",
  scope: instance => ({})
});`);
    });
});