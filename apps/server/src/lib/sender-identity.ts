/**
 * Who an AI-written email is from, derived from the mailbox actually sending it
 * so every business, brand or trading name speaks for itself.
 */
export type SenderIdentity = {
  personName?: string | null;
  mailboxName?: string | null;
  mailboxEmail?: string | null;
  businessName?: string | null;
  businessDescription?: string | null;
  businessWebsite?: string | null;
  workspaceName?: string | null;
};

const clean = (value?: string | null, max = 300) =>
  (value ?? '').replace(/[<>\n\r]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

export function senderIdentityPrompt(identity: SenderIdentity): string {
  const person = clean(identity.personName);
  const mailboxName = clean(identity.mailboxName);
  const email = clean(identity.mailboxEmail).toLowerCase();
  const domain = email.includes('@') ? email.split('@')[1] : '';
  const business = clean(identity.businessName);
  const description = clean(identity.businessDescription, 1000);
  const website = clean(identity.businessWebsite);
  const workspace = clean(identity.workspaceName);

  const lines = ['## Sender'];
  if (person) lines.push(`You are writing as ${person}.`);
  if (email) {
    lines.push(`The email is sent from ${mailboxName && mailboxName !== email ? `"${mailboxName}" <${email}>` : email}.`);
  }
  if (business) {
    lines.push(`Write on behalf of the business "${business}".`);
    if (description) lines.push(`About this business: ${description}`);
    if (website) lines.push(`Its website: ${website}`);
  } else if (domain) {
    lines.push(
      `Write on behalf of the business behind this mailbox; infer its name from the mailbox name "${mailboxName || email}" and the domain ${domain}.`,
    );
  } else if (workspace) {
    lines.push(`Write on behalf of ${workspace}.`);
  }
  lines.push(
    'Sign off as this sender and business. Never mention, promote or sign as the email software or platform used to send the message unless the user explicitly asks you to.',
  );
  return lines.join('\n');
}
