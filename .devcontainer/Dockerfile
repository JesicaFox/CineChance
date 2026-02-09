FROM alpine:3.23

# Install essential tools and Node.js/npm via apk (runs as root during build)
RUN apk add --no-cache \
    nodejs \
    npm \
    git \
    bash \
    curl \
    sudo \
    ca-certificates

ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=1000

# Create non-root user to match VS Code Remote - Containers conventions
RUN addgroup -g ${USER_GID} ${USERNAME} \
    && adduser -D -u ${USER_UID} -G ${USERNAME} ${USERNAME} \
    && echo "${USERNAME} ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/${USERNAME} \
    && chmod 0440 /etc/sudoers.d/${USERNAME}

ENV HOME=/home/${USERNAME}
WORKDIR /workspaces/CineChance

# Use non-root user by default
USER ${USERNAME}

CMD ["/bin/bash"]
