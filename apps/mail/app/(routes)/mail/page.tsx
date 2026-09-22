import { Navigate } from 'react-router';

export function clientLoader() {
  return Response.redirect(`${import.meta.env.VITE_PUBLIC_APP_URL}/mail/inbox`);
}

// Keep an element on the index route so React Router does not render a blank
// outlet while the client loader redirect is being resolved.
export default function MailIndex() {
  return <Navigate to="/mail/inbox" replace />;
}
