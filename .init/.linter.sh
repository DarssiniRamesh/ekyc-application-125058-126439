#!/bin/bash
cd /home/kavia/workspace/code-generation/ekyc-application-125058-126439/EKYCBackendService
npm run lint
LINT_EXIT_CODE=$?
if [ $LINT_EXIT_CODE -ne 0 ]; then
  exit 1
fi

