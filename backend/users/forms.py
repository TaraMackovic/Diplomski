from django import forms
from django.contrib.auth.models import User


class RegisterForm(forms.Form):

    first_name = forms.CharField(max_length=100)

    last_name = forms.CharField(max_length=100)

    username = forms.CharField(max_length=100)

    email = forms.EmailField()

    phone_number = forms.CharField(required=False)

    password = forms.CharField(widget=forms.PasswordInput)

    confirm_password = forms.CharField(widget=forms.PasswordInput)