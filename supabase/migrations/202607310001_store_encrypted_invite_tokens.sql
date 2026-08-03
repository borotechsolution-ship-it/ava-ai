alter table demo_invites
  add column if not exists token_ciphertext text;
