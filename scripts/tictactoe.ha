(def boardState (:array :char 9))
(def currentTurn :char)

(fn (getInput (text :string) :int)
  (def input :char)
    
  (while true
    (write text)
    
    (assign input (read))

    (write input "\n")

    (if (input == "0") (return 0) )
    (if (input == "1") (return 1) )
    (if (input == "2") (return 2) )
    (if (input == "3") (return 3) )
    (if (input == "4") (return 4) )
    (if (input == "5") (return 5) )
    (if (input == "6") (return 6) )
    (if (input == "7") (return 7) )
    (if (input == "8") (return 8) )

    (write "Not recognized\n")
  )
)

(fn (doTurn (current :char) :void)
  (def input :int)

  (while true
    (if (current == "X")
      (write "It's X's turn\n")
    )

    (if (current == "O")
      (write "It's O's turn\n")
    )

    (assign input (getInput "enter new location: "))

    (if ((get boardState input) != " ")
      (write "That space is already taken\n")
      (continue)
    )

    (set boardState input current)

    (break)
  )
)

(fn (checkWinSingle (a :int) (b :int) (c :int) :char)
  (if ((get boardState a) == " ")
    (return " ")
  )

  (if ((get boardState a) != (get boardState b))
    (return " ")
  )

  (if ((get boardState b) != (get boardState c))
    (return " ")
  )

  (return (get boardState a))
)

(fn (checkWin :char)
  (def result :char)

  (assign result (checkWinSingle 0 1 2))
  (if (result != " ") (return result))

  (assign result (checkWinSingle 3 4 5))
  (if (result != " ") (return result))

  (assign result (checkWinSingle 6 7 8))
  (if (result != " ") (return result))

  (assign result (checkWinSingle 0 3 6))
  (if (result != " ") (return result))

  (assign result (checkWinSingle 1 4 7))
  (if (result != " ") (return result))

  (assign result (checkWinSingle 2 5 8))
  (if (result != " ") (return result))

  (assign result (checkWinSingle 0 4 8))
  (if (result != " ") (return result))

  (assign result (checkWinSingle 2 4 6))
  (if (result != " ") (return result))
)

(fn (reset :void)
  (set boardState 0 " ")
  (set boardState 1 " ")
  (set boardState 2 " ")
  (set boardState 3 " ")
  (set boardState 4 " ")
  (set boardState 5 " ")
  (set boardState 6 " ")
  (set boardState 7 " ")
  (set boardState 8 " ")

  (assign currentTurn " ")
)

(fn (printBoard :void)
  (write (get boardState 0) " | " (get boardState 1) " | " (get boardState 2) "\n\n"
          (get boardState 3) " | " (get boardState 4) " | " (get boardState 5) "\n\n"
          (get boardState 6) " | " (get boardState 7) " | " (get boardState 8) "\n\n")
)

(fn (main :void)
  (def isWin :char)
  
  (reset)

  (while true
    (printBoard)
  
    (if (currentTurn == "X")
      (doTurn currentTurn)

      (assign currentTurn "O")
    )

    (if (currentTurn == "O")
      (doTurn currentTurn)

      (assign currentTurn "X")
    )
  
    (assign isWin (checkWin))

    (if (isWin != " ")
      (printBoard)

      (write isWin " Wins\n\n")

      (return)
    )
  )
)