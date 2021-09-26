FROM gitpod/workspace-full

USER root

# Install custom tools, runtime, etc.
RUN ["apt-get", "update"]

RUN ["apt-get", "install", "-y", "zsh"]

USER gitpod

# Install Oh-My-Zsh
RUN wget https://github.com/robbyrussell/oh-my-zsh/raw/master/tools/install.sh -O - | zsh || true

# Change zsh theme and zsh plugin
RUN sed -i 's/ZSH_THEME="robbyrussell"/ZSH_THEME="agnoster"/' ~/.zshrc && \
  sed -i 's/plugins=(git)/plugins=(zsh-autosuggestions)/' ~/.zshrc

# install zsh plugin
RUN git clone git://github.com/zsh-users/zsh-autosuggestions && \
  sudo mv zsh-autosuggestions ~/.oh-my-zsh/custom/plugins  

# install aws cdk && aws-cli v2
RUN npm i -g aws-cdk && \
  curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \ 
  unzip awscliv2.zip && \
  sudo ./aws/install

# start zsh
CMD ["zsh"]