/*
  # Make Email Lookups Case-Insensitive

  1. Changes
    - Convert all existing emails to lowercase
    - Add a function to automatically lowercase emails on insert/update
    - Add a trigger to enforce lowercase emails

  2. Security
    - Ensures consistent email matching regardless of case
    - Prevents duplicate emails with different cases
*/

-- Convert all existing emails to lowercase
UPDATE allowed_emails SET email = LOWER(email);

-- Create a function to lowercase emails
CREATE OR REPLACE FUNCTION lowercase_email()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email = LOWER(NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically lowercase emails
DROP TRIGGER IF EXISTS lowercase_email_trigger ON allowed_emails;
CREATE TRIGGER lowercase_email_trigger
  BEFORE INSERT OR UPDATE ON allowed_emails
  FOR EACH ROW
  EXECUTE FUNCTION lowercase_email();