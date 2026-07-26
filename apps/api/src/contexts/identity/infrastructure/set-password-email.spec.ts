import { renderSetPasswordEmail } from './set-password-email';

describe('renderSetPasswordEmail', () => {
  const params = {
    to: 'donor@example.com',
    name: 'Ana',
    link: 'https://responsegrid.app/crear-contrasena?token=abc123',
  };

  it('addresses the recipient and includes the link in both bodies', () => {
    const msg = renderSetPasswordEmail(params);
    expect(msg.to).toBe('donor@example.com');
    expect(msg.text).toContain('Ana');
    expect(msg.text).toContain(params.link);
    expect(msg.html).toContain(params.link);
  });

  it('is bilingual (ES and EN)', () => {
    const msg = renderSetPasswordEmail(params);
    expect(msg.subject).toContain('Crea tu contraseña');
    expect(msg.subject).toContain('Create your password');
    // ES copy
    expect(msg.text).toContain('Crea tu contraseña');
    // EN copy
    expect(msg.text).toContain('Set your password');
  });

  it('escapes HTML in the name and link to avoid injection', () => {
    const msg = renderSetPasswordEmail({
      ...params,
      name: '<script>x</script>',
      link: 'https://x/set?token=a&b=c',
    });
    expect(msg.html).not.toContain('<script>');
    expect(msg.html).toContain('&lt;script&gt;');
    expect(msg.html).toContain('token=a&amp;b=c');
  });
});
