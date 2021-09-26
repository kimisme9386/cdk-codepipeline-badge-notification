#!/usr/bin/env bash

if [[ ! -d ~/.oh-my-zsh ]]; then
    # Install Oh-My-Zsh
    wget https://github.com/robbyrussell/oh-my-zsh/raw/master/tools/install.sh -O - | zsh || true
fi

wait_time=0
while [[ ! -d ~/.oh-my-zsh ]]; do 
    if [[ ${wait_time} == 10 ]]; then
        break
    fi

    sleep 1; 
    wait_time=$((wait_time+1))
done

if [[ -d ~/.oh-my-zsh ]]; then
    # install zsh plugin
    git clone git://github.com/zsh-users/zsh-autosuggestions && \
    sudo mv zsh-autosuggestions ~/.oh-my-zsh/custom/plugins  

    # Change zsh theme and zsh plugin
    sed -i 's/ZSH_THEME="robbyrussell"/ZSH_THEME="agnoster"/' ~/.zshrc && \
    sed -i 's/plugins=(git)/plugins=(zsh-autosuggestions)/' ~/.zshrc
fi

if grep -q source /usr/share/bash-completion/completions/git ~/.zshrc; then
    echo "source /usr/share/bash-completion/completions/git" >> ~/.zshrc
    echo "alias awsap=\"aws --cli-auto-prompt\"" >> ~/.zshrc
fi 

if ! grep -q "source /usr/share/bash-completion/completions/git" ~/.zshrc; then
   echo "source /usr/share/bash-completion/completions/git" >> ~/.zshrc
fi

if ! grep -q "alias awsap=\"aws --cli-auto-prompt\"" ~/.zshrc; then
   echo "alias awsap=\"aws --cli-auto-prompt\"" >> ~/.zshrc
fi