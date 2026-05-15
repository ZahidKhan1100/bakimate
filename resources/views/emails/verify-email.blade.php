@extends('emails.layout')

@section('title', 'Verify your email — BakiMate')

@section('preheader', 'Confirm your email to activate your BakiMate account.')

@section('content')
  <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#0f172a;">Welcome, {{ $name }}!</p>
  <p style="margin:0 0 24px;color:#475569;">
    Confirm your email address so you can sign in and track customer credit from your shop.
  </p>

  @include('emails.partials.button', ['url' => $verificationUrl, 'label' => 'Verify email'])

  <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
    If the button doesn’t work, paste this link into your browser:
  </p>
  <p style="margin:8px 0 0;word-break:break-all;font-size:12px;color:#00875A;font-weight:600;">
    {{ $verificationUrl }}
  </p>
@endsection

@section('footer_note')
  If you didn’t create a BakiMate account, you can ignore this email.
@endsection
